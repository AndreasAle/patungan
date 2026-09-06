<?php

namespace App\Services;

use App\Enums\ParticipantStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Enums\SplitType;
use App\Events\ParticipantPaid;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ParticipantService
{
    public function __construct(
        private readonly PatunganService $patunganService,
        private readonly InvoiceNumberGenerator $invoiceNumbers,
    ) {}

    /** @param  array<int, array{name: string, amount?: ?int, note?: ?string}>  $participants */
    public function addMany(Patungan $patungan, array $participants): Patungan
    {
        return DB::transaction(function () use ($patungan, $participants): Patungan {
            $position = (int) $patungan->participants()->max('position');

            foreach ($participants as $participant) {
                $amountDue = $patungan->split_type === SplitType::Equal
                    ? (int) $patungan->equal_amount
                    : (int) $participant['amount'];

                $patungan->participants()->create([
                    'name' => $participant['name'],
                    'note' => $participant['note'] ?? null,
                    'amount_due' => $amountDue,
                    'position' => ++$position,
                ]);
            }

            return $this->patunganService->refreshAggregates($patungan);
        });
    }

    /** @param  array{name?: string, note?: ?string, amount_due?: int}  $data */
    public function update(PatunganParticipant $participant, array $data): PatunganParticipant
    {
        return DB::transaction(function () use ($participant, $data): PatunganParticipant {
            if (isset($data['name'])) {
                $participant->name = $data['name'];
            }

            if (array_key_exists('note', $data)) {
                $participant->note = $data['note'];
            }

            if (isset($data['amount_due'])) {
                if ($participant->status === ParticipantStatus::Paid) {
                    throw ValidationException::withMessages([
                        'amount_due' => 'Nominal peserta yang sudah bayar tidak bisa diubah.',
                    ]);
                }

                if ($participant->activePayment()->exists()) {
                    throw ValidationException::withMessages([
                        'amount_due' => 'Peserta ini sedang menunggu pembayaran. Batalkan dulu sebelum mengubah nominal.',
                    ]);
                }

                $participant->amount_due = $data['amount_due'];
            }

            $participant->save();
            $this->patunganService->refreshAggregates($participant->patungan);

            return $participant;
        });
    }

    public function remove(PatunganParticipant $participant): void
    {
        DB::transaction(function () use ($participant): void {
            if ($participant->status === ParticipantStatus::Paid) {
                throw ValidationException::withMessages([
                    'participant' => 'Peserta yang sudah bayar tidak bisa dihapus.',
                ]);
            }

            $patungan = $participant->patungan;
            $participant->payments()->where('status', PaymentStatus::Pending->value)->update([
                'status' => PaymentStatus::Cancelled->value,
                'active_participant_id' => null,
            ]);
            $participant->delete();

            $this->patunganService->refreshAggregates($patungan);
        });
    }

    /**
     * Records a payment made outside the platform (cash, direct transfer). No
     * ledger entry is written because no money reached the platform - only the
     * participant's obligation is cleared, attributed to the organizer.
     */
    public function markPaidManually(PatunganParticipant $participant, User $actor): PatunganParticipant
    {
        DB::transaction(function () use ($participant, $actor): void {
            $locked = PatunganParticipant::query()->lockForUpdate()->findOrFail($participant->id);

            if ($locked->status === ParticipantStatus::Paid) {
                return;
            }

            Payment::query()
                ->where('participant_id', $locked->id)
                ->where('status', PaymentStatus::Pending->value)
                ->update([
                    'status' => PaymentStatus::Cancelled->value,
                    'active_participant_id' => null,
                ]);

            $locked->status = ParticipantStatus::Paid;
            $locked->paid_method = PaymentMethod::Manual;
            $locked->amount_paid = $locked->amount_due;
            $locked->paid_at = now();
            $locked->marked_by_user_id = $actor->id;
            $locked->invoice_number ??= $this->invoiceNumbers->generate();
            $locked->save();

            $participant->setRawAttributes($locked->getAttributes(), true);

            $this->patunganService->refreshAggregates($locked->patungan);

            DB::afterCommit(fn () => ParticipantPaid::dispatch($locked, PaymentMethod::Manual));
        });

        return $participant->refresh();
    }

    /** Clears a manual payment mark, e.g. when the organizer made a mistake. */
    public function unmarkManualPayment(PatunganParticipant $participant): PatunganParticipant
    {
        DB::transaction(function () use ($participant): void {
            if ($participant->paid_method !== PaymentMethod::Manual) {
                throw ValidationException::withMessages([
                    'participant' => 'Hanya pembayaran manual yang bisa dibatalkan.',
                ]);
            }

            $participant->status = ParticipantStatus::Unpaid;
            $participant->paid_method = null;
            $participant->amount_paid = 0;
            $participant->paid_at = null;
            $participant->marked_by_user_id = null;
            // The receipt is void once the payment mark is withdrawn.
            $participant->invoice_number = null;
            $participant->save();

            $this->patunganService->refreshAggregates($participant->patungan);
        });

        return $participant->refresh();
    }
}
