<?php

namespace App\Payments\Doku;

use App\Contracts\PaymentGateway;
use App\Models\Payment;
use App\Payments\ChargeRequest;
use App\Payments\ChargeResult;
use App\Payments\GatewayEvent;
use App\Payments\InboundWebhook;
use Illuminate\Support\Facades\Log;

/**
 * DOKU SNAP Direct API driver, using QRIS MPM so the QR renders inside the
 * Patungan payment page rather than on a hosted checkout.
 *
 *   charge  POST /snap-adapter/b2b/v1.0/qr/qr-mpm-generate
 *   query   POST /snap-adapter/b2b/v1.0/qr/qr-mpm-query
 *   notify  DOKU posts to our webhook route, signature verified before use
 */
final class DokuGateway implements PaymentGateway
{
    public const NAME = 'doku';

    public function __construct(
        private readonly DokuQrisService $qris,
        private readonly DokuNotificationVerifier $verifier,
        private readonly DokuExternalIdGenerator $externalIds,
    ) {}

    public function name(): string
    {
        return self::NAME;
    }

    public function createQrisCharge(ChargeRequest $request): ChargeResult
    {
        return $this->qris->generate($request, $this->externalIds->generate());
    }

    public function parseWebhook(InboundWebhook $webhook): ?GatewayEvent
    {
        $payload = $webhook->payload;

        $reference = $payload['originalPartnerReferenceNo'] ?? null;
        $status = $payload['latestTransactionStatus'] ?? null;

        // Not a payment notification we know how to act on.
        if (! is_string($reference) || $reference === '' || ! is_string($status)) {
            return null;
        }

        $amount = DokuStatusMapper::amountToRupiah($payload['amount']['value'] ?? null);

        if ($amount === null) {
            Log::channel('doku')->warning('DOKU notification carried an unreadable amount', [
                'partner_reference_no' => $reference,
                'external_id' => $webhook->header('X-EXTERNAL-ID'),
            ]);

            return null;
        }

        return new GatewayEvent(
            reference: $reference,
            transactionId: is_string($payload['originalReferenceNo'] ?? null)
                ? $payload['originalReferenceNo']
                : null,
            status: DokuStatusMapper::fromTransactionStatus($status),
            grossAmount: $amount,
            signatureValid: $this->verifier->verify($webhook),
            eventType: 'qris.notification.'.$status,
            raw: array_filter([
                'originalPartnerReferenceNo' => $reference,
                'originalReferenceNo' => $payload['originalReferenceNo'] ?? null,
                'latestTransactionStatus' => $status,
                'transactionStatusDesc' => $payload['transactionStatusDesc'] ?? null,
                'amount' => $payload['amount'] ?? null,
            ], static fn ($value) => $value !== null),
        );
    }

    public function fetchStatus(Payment $payment): ?GatewayEvent
    {
        return $this->qris->query($payment, $this->externalIds->generate());
    }

    public function cancel(Payment $payment): void
    {
        /*
         * DOKU's QRIS MPM has no cancel endpoint - a generated QR simply stops
         * being payable once its validityPeriod passes, which we set from the
         * invoice TTL. Pretending to cancel would be worse than doing nothing,
         * so the invoice is left to expire and ExpireStalePayments frees the
         * participant's slot.
         */
        Log::channel('doku')->info('DOKU QRIS left to expire', [
            'payment' => $payment->uuid,
            'expires_at' => $payment->expires_at?->toIso8601String(),
        ]);
    }
}
