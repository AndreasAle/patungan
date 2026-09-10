<?php

namespace App\Payments\Dana;

use App\Contracts\AcknowledgesWebhooks;
use App\Contracts\PaymentGateway;
use App\Models\Payment;
use App\Models\WebhookLog;
use App\Payments\ChargeRequest;
use App\Payments\ChargeResult;
use App\Payments\GatewayEvent;
use App\Payments\InboundWebhook;
use Illuminate\Support\Facades\Log;

/**
 * DANA SNAP QRIS MPM (Acquirer) driver.
 *
 *   charge  POST /v1.0/qr/qr-mpm-generate.htm
 *   query   POST /rest/v1.1/debit/status
 *   cancel  POST /v1.0/debit/cancel.htm
 *   notify  DANA posts Finish Notify to our webhook route, signature verified
 *           before anything is credited
 *
 * The QR is rendered inside the Patungan payment page rather than on a hosted
 * checkout, so a participant never leaves a screen that carries the organizer's
 * name and the amount they agreed to.
 */
final class DanaGateway implements AcknowledgesWebhooks, PaymentGateway
{
    public const NAME = 'dana';

    public function __construct(
        private readonly DanaQrisService $qris,
        private readonly DanaNotificationVerifier $verifier,
        private readonly DanaExternalIdGenerator $externalIds,
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

        // Not a payment notification we know how to act on. Returning null lets
        // the endpoint answer politely instead of erroring, which stops DANA
        // retrying something we will never understand.
        if (! is_string($reference) || $reference === '' || ! is_string($status)) {
            return null;
        }

        $amount = DanaStatusMapper::amountToRupiah($payload['amount']['value'] ?? null);

        if ($amount === null) {
            /*
             * Refused rather than defaulted. The amount is what the downstream
             * check compares against the invoice, and inventing one would
             * disable the single guard that stops a wrong figure being
             * credited.
             */
            Log::channel('dana')->warning('DANA notification carried an unreadable amount', [
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
            status: DanaStatusMapper::fromTransactionStatus($status),
            grossAmount: $amount,
            signatureValid: $this->verifier->verify($webhook),
            eventType: 'qris.notification.'.$status,
            raw: array_filter([
                'originalPartnerReferenceNo' => $reference,
                'originalReferenceNo' => $payload['originalReferenceNo'] ?? null,
                'latestTransactionStatus' => $status,
                'transactionStatusDesc' => $payload['transactionStatusDesc'] ?? null,
                'amount' => $payload['amount'] ?? null,
                'finishedTime' => $payload['finishedTime'] ?? null,
            ], static fn ($value): bool => $value !== null),
        );
    }

    public function fetchStatus(Payment $payment): ?GatewayEvent
    {
        return $this->qris->query($payment, $this->externalIds->generate());
    }

    public function cancel(Payment $payment): void
    {
        $this->qris->cancel($payment, $this->externalIds->generate(), 'Invoice expired or abandoned');
    }

    /**
     * DANA's Finish Notify reply, in the exact shape their reference requires:
     * responseCode is HTTP status + service code 56 + case code.
     *
     * Only a genuine processing failure asks for a retry. A rejected signature
     * is acknowledged instead - retrying will never make a forged notification
     * verify, and answering 5xx would let anyone on the internet make DANA
     * hammer this endpoint for seven days by posting one bad signature.
     *
     * @return array{body: array<string, mixed>, http_status: int}
     */
    public function acknowledge(string $status): array
    {
        if ($status === WebhookLog::STATUS_FAILED) {
            return $this->reply('5005601', 'Internal Server Error', 500);
        }

        return $this->reply('2005600', 'Successful', 200);
    }

    /**
     * Used when the driver itself cannot be built - bad credentials, unreadable
     * key. That is our fault and it is transient, so DANA is asked to retry
     * rather than told the notification was handled.
     *
     * @return array{body: array<string, mixed>, http_status: int}
     */
    public function acknowledgeUnavailable(): array
    {
        return $this->reply('5005601', 'Internal Server Error', 500);
    }

    /** @return array{body: array<string, mixed>, http_status: int} */
    private function reply(string $code, string $message, int $httpStatus): array
    {
        return [
            'body' => ['responseCode' => $code, 'responseMessage' => $message],
            'http_status' => $httpStatus,
        ];
    }
}
