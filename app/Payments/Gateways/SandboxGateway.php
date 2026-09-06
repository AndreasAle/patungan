<?php

namespace App\Payments\Gateways;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Payments\ChargeRequest;
use App\Payments\ChargeResult;
use App\Payments\GatewayEvent;
use Carbon\CarbonImmutable;

/**
 * Local development driver. It performs no network calls and issues a QR payload
 * that no bank app can scan - it exists so the full charge -> webhook -> ledger
 * path can be exercised before real Midtrans credentials are available.
 *
 * PaymentGatewayManager refuses to resolve this driver outside local/testing.
 */
class SandboxGateway implements PaymentGateway
{
    public function __construct(private readonly string $secret) {}

    public function name(): string
    {
        return 'sandbox';
    }

    public function isSimulated(): bool
    {
        return true;
    }

    public function createQrisCharge(ChargeRequest $request): ChargeResult
    {
        $transactionId = 'sbx_'.bin2hex(random_bytes(10));

        return new ChargeResult(
            transactionId: $transactionId,
            status: PaymentStatus::Pending,
            qrString: 'SIMULASI|'.$request->reference.'|'.$request->amount,
            qrUrl: null,
            expiresAt: CarbonImmutable::now()->addSeconds($request->expirySeconds),
            raw: [
                'simulated' => true,
                'transaction_id' => $transactionId,
                'order_id' => $request->reference,
                'gross_amount' => (string) $request->amount,
                'transaction_status' => 'pending',
            ],
        );
    }

    public function parseWebhook(array $payload, string $rawBody): ?GatewayEvent
    {
        $orderId = $payload['order_id'] ?? null;
        $transactionStatus = $payload['transaction_status'] ?? null;

        if (! is_string($orderId) || $transactionStatus === null) {
            return null;
        }

        $expected = $this->signature(
            $orderId,
            (string) ($payload['status_code'] ?? ''),
            (string) ($payload['gross_amount'] ?? ''),
        );

        return new GatewayEvent(
            reference: $orderId,
            transactionId: isset($payload['transaction_id']) ? (string) $payload['transaction_id'] : null,
            status: $this->mapStatus((string) $transactionStatus),
            grossAmount: (int) round((float) ($payload['gross_amount'] ?? 0)),
            signatureValid: is_string($payload['signature_key'] ?? null)
                && hash_equals($expected, $payload['signature_key']),
            eventType: (string) $transactionStatus,
            raw: $payload,
        );
    }

    public function fetchStatus(Payment $payment): ?GatewayEvent
    {
        return null;
    }

    public function cancel(Payment $payment): void
    {
        // Nothing to cancel - the simulator holds no remote state.
    }

    public function signature(string $orderId, string $statusCode, string $grossAmount): string
    {
        return hash('sha512', $orderId.$statusCode.$grossAmount.$this->secret);
    }

    private function mapStatus(string $status): PaymentStatus
    {
        return match ($status) {
            'settlement', 'capture' => PaymentStatus::Paid,
            'expire' => PaymentStatus::Expired,
            'cancel' => PaymentStatus::Cancelled,
            'deny', 'failure' => PaymentStatus::Failed,
            default => PaymentStatus::Pending,
        };
    }
}
