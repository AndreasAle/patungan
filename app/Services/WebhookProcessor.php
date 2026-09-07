<?php

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\WebhookLog;
use App\Payments\GatewayEvent;
use App\Payments\InboundWebhook;
use Illuminate\Database\QueryException;
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

    public function handle(PaymentGateway $gateway, InboundWebhook $webhook): WebhookLog
    {
        $event = $gateway->parseWebhook($webhook);
        $sanitised = WebhookLog::sanitise($webhook->payload);
        $requestId = $this->requestId($webhook);

        try {
            $log = WebhookLog::create([
                'provider' => $gateway->name(),
                'request_id' => $requestId,
                'event_type' => $event?->eventType,
                'external_id' => $event?->reference,
                'payload' => $sanitised,
                'signature_valid' => (bool) $event?->signatureValid,
                'status' => WebhookLog::STATUS_RECEIVED,
            ]);
        } catch (QueryException $e) {
            /*
             * The unique index on (provider, request_id) caught a redelivery.
             * The first copy is already recorded and applied, so this one is
             * acknowledged without touching money again.
             */
            $seen = WebhookLog::query()
                ->where('provider', $gateway->name())
                ->where('request_id', $requestId)
                ->first();

            if ($seen === null) {
                throw $e;
            }

            Log::info('Duplicate webhook ignored', [
                'provider' => $gateway->name(),
                'request_id' => $requestId,
            ]);

            return $seen;
        }

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

    /**
     * The provider's id for this delivery. DOKU sends X-EXTERNAL-ID; providers
     * that send nothing usable get null, which the unique index allows through
     * so their notifications still rely on the idempotent apply below.
     */
    private function requestId(InboundWebhook $webhook): ?string
    {
        foreach (['X-EXTERNAL-ID', 'X-REQUEST-ID', 'Request-Id'] as $header) {
            $value = $webhook->header($header);

            if ($value !== null) {
                return substr($value, 0, 64);
            }
        }

        return null;
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
