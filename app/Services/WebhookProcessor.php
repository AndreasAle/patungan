<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\WebhookLog;
use App\Payments\GatewayEvent;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Single entry point for inbound payment notifications.
 *
 * Every payload is logged (sanitised), the signature is verified before anything
 * is trusted, the amount is compared against our own record, and applying the
 * outcome is idempotent.
 */
class WebhookProcessor
{
    public function __construct(private readonly PaymentService $payments) {}

    /** @param  array<string, mixed>  $payload */
    public function handle(PaymentGateway $gateway, array $payload, string $rawBody): WebhookLog
    {
        $event = $gateway->parseWebhook($payload, $rawBody);
        $sanitised = WebhookLog::sanitise($payload);

        $log = WebhookLog::create([
            'provider' => $gateway->name(),
            'event_type' => $event?->eventType,
            'external_id' => $event?->reference,
            'payload' => $sanitised,
            'signature_valid' => (bool) $event?->signatureValid,
            'status' => WebhookLog::STATUS_RECEIVED,
        ]);

        if ($event === null) {
            return $this->finish($log, WebhookLog::STATUS_IGNORED, 'Payload is not a payment notification.');
        }

        if (! $event->signatureValid) {
            Log::warning('Rejected webhook with invalid signature', [
                'provider' => $gateway->name(),
                'reference' => $event->reference,
            ]);

            return $this->finish($log, WebhookLog::STATUS_REJECTED, 'Invalid signature.');
        }

        $payment = Payment::query()
            ->where('gateway', $gateway->name())
            ->where('gateway_reference', $event->reference)
            ->first();

        if ($payment === null) {
            return $this->finish($log, WebhookLog::STATUS_IGNORED, 'Unknown payment reference.');
        }

        if ($event->grossAmount !== $payment->charged_amount) {
            Log::error('Webhook amount mismatch', [
                'reference' => $event->reference,
                'expected' => $payment->charged_amount,
                'received' => $event->grossAmount,
            ]);

            return $this->finish($log, WebhookLog::STATUS_REJECTED, 'Amount does not match the invoice.');
        }

        try {
            $applied = $this->apply($payment, $event);
        } catch (Throwable $e) {
            Log::error('Webhook processing failed', [
                'reference' => $event->reference,
                'error' => $e->getMessage(),
            ]);

            return $this->finish($log, WebhookLog::STATUS_FAILED, $e->getMessage());
        }

        return $this->finish(
            $log,
            $applied ? WebhookLog::STATUS_PROCESSED : WebhookLog::STATUS_DUPLICATE,
        );
    }

    private function apply(Payment $payment, GatewayEvent $event): bool
    {
        if ($event->status === PaymentStatus::Paid) {
            return $this->payments->markAsPaid($payment, $event->transactionId, $event->raw);
        }

        if ($event->status === PaymentStatus::Pending) {
            return false;
        }

        return $this->payments->markAsFinal($payment, $event->status, $event->raw);
    }

    private function finish(WebhookLog $log, string $status, ?string $error = null): WebhookLog
    {
        $log->forceFill([
            'status' => $status,
            'error' => $error,
            'processed_at' => now(),
        ])->save();

        return $log;
    }
}
