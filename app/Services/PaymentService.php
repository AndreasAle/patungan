<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\Enums\ParticipantStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Events\ParticipantPaid;
use App\Events\PaymentCreated;
use App\Events\PaymentPaid;
use App\Models\PatunganParticipant;
use App\Models\Payment;
use App\Payments\ChargeRequest;
use App\Payments\PaymentGatewayException;
use App\Payments\PaymentGatewayManager;
use App\Support\Money;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PaymentService
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly FeeCalculator $fees,
        private readonly LedgerService $ledger,
        private readonly PatunganService $patunganService,
        private readonly Analytics $analytics,
        private readonly InvoiceNumberGenerator $invoiceNumbers,
    ) {}

    /**
     * Opens a QRIS invoice for a participant.
     *
     * The amount is read from the participant row - the caller never supplies it.
     * A unique index on payments.active_participant_id guarantees a participant
     * can hold only one PENDING invoice, even when two devices race.
     */
    public function createForParticipant(PatunganParticipant $participant, ?string $visitorKey = null): Payment
    {
        $gateway = $this->gateways->default();
        $participant->loadMissing('patungan');

        $payment = $this->reserveInvoice($participant, $gateway);

        if ($payment->gateway_transaction_id !== null) {
            // An existing, still-valid invoice was reused.
            return $payment;
        }

        try {
            $charge = $gateway->createQrisCharge(new ChargeRequest(
                reference: $payment->gateway_reference,
                amount: $payment->charged_amount,
                description: $participant->patungan->title.' - '.$participant->name,
                participantName: $participant->name,
                patunganTitle: $participant->patungan->title,
                expirySeconds: $participant->patungan->invoiceTtl((int) config('patungan.invoice_ttl')),
            ));
        } catch (PaymentGatewayException $e) {
            $this->releaseInvoice($payment, PaymentStatus::Failed);

            throw $e;
        }

        $payment->forceFill([
            'gateway_transaction_id' => $charge->transactionId,
            'status' => $charge->status->value,
            'qr_string' => $charge->qrString,
            'qr_url' => $charge->qrUrl,
            'expires_at' => $charge->expiresAt,
            'raw_response' => $charge->raw,
            'active_participant_id' => $charge->status->isActive() ? $participant->id : null,
        ])->save();

        if ($participant->status === ParticipantStatus::Unpaid) {
            $participant->forceFill(['status' => ParticipantStatus::Pending->value])->save();
        }

        PaymentCreated::dispatch($payment);
        $this->analytics->record(
            Analytics::PAYMENT_CREATED,
            ['amount' => $payment->charged_amount, 'gateway' => $payment->gateway],
            patunganId: $payment->patungan_id,
            paymentId: $payment->id,
            visitorKey: $visitorKey,
        );

        return $payment;
    }

    /**
     * Applies a PAID outcome from the gateway. Idempotent: replaying the same
     * notification any number of times credits the organizer exactly once.
     */
    public function markAsPaid(Payment $payment, ?string $transactionId, array $raw = []): bool
    {
        $applied = DB::transaction(function () use ($payment, $transactionId, $raw): bool {
            /** @var Payment $locked */
            $locked = Payment::query()->lockForUpdate()->find($payment->id);

            if ($locked === null || $locked->status === PaymentStatus::Paid) {
                return false;
            }

            $locked->forceFill([
                'status' => PaymentStatus::Paid->value,
                'paid_at' => now(),
                'active_participant_id' => null,
                'gateway_transaction_id' => $transactionId ?? $locked->gateway_transaction_id,
                'raw_response' => $raw ?: $locked->raw_response,
            ])->save();

            /** @var PatunganParticipant $participant */
            $participant = PatunganParticipant::query()->lockForUpdate()->find($locked->participant_id);

            if ($participant->status !== ParticipantStatus::Paid) {
                $participant->forceFill([
                    'status' => ParticipantStatus::Paid->value,
                    'paid_method' => PaymentMethod::Qris->value,
                    'amount_paid' => $locked->amount,
                    'paid_at' => now(),
                    'invoice_number' => $participant->invoice_number ?? $this->invoiceNumbers->generate(),
                ])->save();
            }

            $this->ledger->recordPaymentReceived($locked->load('participant'));
            $this->patunganService->refreshAggregates($participant->patungan()->lockForUpdate()->first());

            $payment->setRawAttributes($locked->getAttributes(), true);

            DB::afterCommit(function () use ($locked, $participant): void {
                PaymentPaid::dispatch($locked);
                ParticipantPaid::dispatch($participant, PaymentMethod::Qris);
            });

            return true;
        });

        if ($applied) {
            $this->analytics->record(
                Analytics::PAYMENT_PAID,
                ['amount' => $payment->charged_amount, 'net' => $payment->net_amount],
                userId: $payment->organizer_id,
                patunganId: $payment->patungan_id,
                paymentId: $payment->id,
            );
        }

        return $applied;
    }

    /** Applies a non-paid terminal outcome and frees the participant's invoice slot. */
    public function markAsFinal(Payment $payment, PaymentStatus $status, array $raw = []): bool
    {
        if ($status === PaymentStatus::Paid) {
            return $this->markAsPaid($payment, null, $raw);
        }

        return DB::transaction(function () use ($payment, $status, $raw): bool {
            /** @var Payment $locked */
            $locked = Payment::query()->lockForUpdate()->find($payment->id);

            if ($locked === null || $locked->status->isFinal()) {
                return false;
            }

            $locked->forceFill([
                'status' => $status->value,
                'active_participant_id' => null,
                'raw_response' => $raw ?: $locked->raw_response,
            ])->save();

            $participant = PatunganParticipant::query()->lockForUpdate()->find($locked->participant_id);

            if ($participant !== null && $participant->status === ParticipantStatus::Pending) {
                $participant->forceFill(['status' => ParticipantStatus::Unpaid->value])->save();
            }

            $payment->setRawAttributes($locked->getAttributes(), true);

            return true;
        });
    }

    /** Sweeps invoices whose expiry has passed so participants can retry. */
    public function expireStalePayments(): int
    {
        $expired = 0;

        Payment::query()
            ->where('status', PaymentStatus::Pending->value)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->orderBy('id')
            ->chunkById(100, function ($payments) use (&$expired): void {
                foreach ($payments as $payment) {
                    if ($this->markAsFinal($payment, PaymentStatus::Expired)) {
                        $expired++;
                    }
                }
            });

        return $expired;
    }

    /**
     * Creates the PENDING row that reserves the participant's single invoice slot,
     * or returns the still-valid invoice they already have.
     */
    private function reserveInvoice(PatunganParticipant $participant, PaymentGateway $gateway): Payment
    {
        return DB::transaction(function () use ($participant, $gateway): Payment {
            /** @var PatunganParticipant $locked */
            $locked = PatunganParticipant::query()->lockForUpdate()->findOrFail($participant->id);
            $patungan = $locked->patungan()->first();

            if ($patungan->hasExpired()) {
                throw new PaymentGatewayException('Batas waktu pembayaran patungan ini sudah lewat.');
            }

            if (! $patungan->acceptsPayment()) {
                throw new PaymentGatewayException('Patungan ini sudah tidak menerima pembayaran.');
            }

            if ($locked->status->isSettled()) {
                throw new PaymentGatewayException('Peserta ini sudah bayar.');
            }

            $existing = Payment::query()
                ->where('participant_id', $locked->id)
                ->where('status', PaymentStatus::Pending->value)
                ->lockForUpdate()
                ->first();

            if ($existing !== null) {
                if (! $existing->isExpired() && $existing->charged_amount === $this->fees->for($locked->amount_due)->chargedAmount) {
                    return $existing;
                }

                // Stale or re-priced: retire it so a fresh invoice can be opened.
                $existing->forceFill([
                    'status' => PaymentStatus::Expired->value,
                    'active_participant_id' => null,
                ])->save();
            }

            $breakdown = $this->fees->for($locked->amount_due);

            $payment = new Payment;
            $payment->forceFill(array_merge($breakdown->toArray(), [
                'uuid' => (string) Str::uuid(),
                'patungan_id' => $patungan->id,
                'participant_id' => $locked->id,
                'organizer_id' => $patungan->organizer_id,
                'gateway' => $gateway->name(),
                'gateway_reference' => $this->makeReference(),
                'currency' => $patungan->currency,
                'payment_method' => PaymentMethod::Qris->value,
                'status' => PaymentStatus::Pending->value,
                'active_participant_id' => $locked->id,
                'expires_at' => now()->addSeconds($patungan->invoiceTtl((int) config('patungan.invoice_ttl'))),
            ]));

            try {
                $payment->save();
            } catch (QueryException $e) {
                // Lost the race for the participant's invoice slot - use the winner.
                $winner = Payment::query()
                    ->where('participant_id', $locked->id)
                    ->where('status', PaymentStatus::Pending->value)
                    ->first();

                if ($winner === null) {
                    throw $e;
                }

                return $winner;
            }

            $payment->setRelation('participant', $locked);
            $locked->setRelation('patungan', $patungan);

            return $payment;
        });
    }

    private function releaseInvoice(Payment $payment, PaymentStatus $status): void
    {
        $payment->forceFill([
            'status' => $status->value,
            'active_participant_id' => null,
        ])->save();

        Log::warning('Payment invoice released', [
            'payment' => $payment->uuid,
            'status' => $status->value,
        ]);
    }

    private function makeReference(): string
    {
        return 'PTG-'.now()->format('ymd').'-'.strtoupper(Str::random(12));
    }

    /** Human-readable amount, used in copy and notifications. */
    public function formatAmount(int $amount): string
    {
        return Money::format($amount);
    }
}
