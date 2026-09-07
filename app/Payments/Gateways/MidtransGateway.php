<?php

namespace App\Payments\Gateways;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Payments\ChargeRequest;
use App\Payments\ChargeResult;
use App\Payments\GatewayEvent;
use App\Payments\InboundWebhook;
use App\Payments\PaymentGatewayException;
use Carbon\CarbonImmutable;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Midtrans Core API driver using dynamic QRIS.
 *
 * Charge:  POST /v2/charge with payment_type=qris
 * Webhook: HTTP notification whose signature_key is
 *          sha512(order_id + status_code + gross_amount + server_key)
 */
class MidtransGateway implements PaymentGateway
{
    public function __construct(
        private readonly string $serverKey,
        private readonly bool $production,
    ) {}

    public function name(): string
    {
        return 'midtrans';
    }

    public function createQrisCharge(ChargeRequest $request): ChargeResult
    {
        $payload = [
            'payment_type' => 'qris',
            'transaction_details' => [
                'order_id' => $request->reference,
                // Midtrans expects rupiah with no fractional part.
                'gross_amount' => $request->amount,
            ],
            'qris' => ['acquirer' => 'gopay'],
            'item_details' => [[
                'id' => $request->reference,
                'price' => $request->amount,
                'quantity' => 1,
                'name' => mb_substr($request->description, 0, 50),
            ]],
            'custom_expiry' => [
                'expiry_duration' => max(1, (int) round($request->expirySeconds / 60)),
                'unit' => 'minute',
            ],
        ];

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->acceptJson()
                ->asJson()
                ->timeout(20)
                ->post($this->apiBase().'/v2/charge', $payload);
        } catch (ConnectionException $e) {
            throw new PaymentGatewayException('Tidak bisa menghubungi payment gateway. Coba lagi sebentar lagi.', previous: $e);
        }

        $body = $response->json() ?? [];

        // Midtrans returns 2xx for accepted charges; "201" means pending payment.
        if (! $response->successful() || ! in_array((string) ($body['status_code'] ?? ''), ['200', '201'], true)) {
            Log::warning('Midtrans charge rejected', [
                'reference' => $request->reference,
                'status_code' => $body['status_code'] ?? $response->status(),
                'status_message' => $body['status_message'] ?? null,
            ]);

            throw new PaymentGatewayException('Pembayaran tidak bisa dibuat sekarang. Coba lagi sebentar lagi.');
        }

        $qrUrl = null;
        foreach ($body['actions'] ?? [] as $action) {
            if (($action['name'] ?? null) === 'generate-qr-code') {
                $qrUrl = $action['url'] ?? null;
            }
        }

        $expiresAt = isset($body['expiry_time'])
            ? CarbonImmutable::parse($body['expiry_time'])
            : CarbonImmutable::now()->addSeconds($request->expirySeconds);

        return new ChargeResult(
            transactionId: (string) $body['transaction_id'],
            status: $this->mapStatus((string) ($body['transaction_status'] ?? 'pending')),
            qrString: $body['qr_string'] ?? null,
            qrUrl: $qrUrl,
            expiresAt: $expiresAt,
            raw: $body,
        );
    }

    public function parseWebhook(InboundWebhook $webhook): ?GatewayEvent
    {
        $payload = $webhook->payload;
        $orderId = $payload['order_id'] ?? null;
        $statusCode = $payload['status_code'] ?? null;
        $grossAmount = $payload['gross_amount'] ?? null;
        $transactionStatus = $payload['transaction_status'] ?? null;

        if (! is_string($orderId) || $transactionStatus === null) {
            return null;
        }

        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.$this->serverKey);
        $signatureValid = is_string($payload['signature_key'] ?? null)
            && hash_equals($expected, $payload['signature_key']);

        return new GatewayEvent(
            reference: $orderId,
            transactionId: isset($payload['transaction_id']) ? (string) $payload['transaction_id'] : null,
            status: $this->mapStatus((string) $transactionStatus, $payload['fraud_status'] ?? null),
            // gross_amount arrives as "25000.00".
            grossAmount: (int) round((float) $grossAmount),
            signatureValid: $signatureValid,
            eventType: (string) $transactionStatus,
            raw: $payload,
        );
    }

    public function fetchStatus(Payment $payment): ?GatewayEvent
    {
        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->acceptJson()
                ->timeout(15)
                ->get($this->apiBase().'/v2/'.$payment->gateway_reference.'/status');
        } catch (ConnectionException) {
            return null;
        }

        $body = $response->json();

        if (! is_array($body) || ! isset($body['transaction_status'])) {
            return null;
        }

        return $this->parseWebhook(InboundWebhook::fake($body));
    }

    public function cancel(Payment $payment): void
    {
        try {
            Http::withBasicAuth($this->serverKey, '')
                ->acceptJson()
                ->timeout(15)
                ->post($this->apiBase().'/v2/'.$payment->gateway_reference.'/cancel');
        } catch (ConnectionException $e) {
            // Cancellation is best-effort; the invoice expires on its own anyway.
            Log::info('Midtrans cancel failed', ['reference' => $payment->gateway_reference, 'error' => $e->getMessage()]);
        }
    }

    private function apiBase(): string
    {
        return $this->production
            ? 'https://api.midtrans.com'
            : 'https://api.sandbox.midtrans.com';
    }

    private function mapStatus(string $transactionStatus, ?string $fraudStatus = null): PaymentStatus
    {
        return match ($transactionStatus) {
            'capture' => $fraudStatus === 'deny' ? PaymentStatus::Failed : PaymentStatus::Paid,
            'settlement' => PaymentStatus::Paid,
            'pending' => PaymentStatus::Pending,
            'deny', 'failure' => PaymentStatus::Failed,
            'cancel' => PaymentStatus::Cancelled,
            'expire' => PaymentStatus::Expired,
            'refund', 'partial_refund' => PaymentStatus::Refunded,
            default => PaymentStatus::Pending,
        };
    }
}
