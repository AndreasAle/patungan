<?php

namespace Tests\Feature;

use App\Enums\LedgerType;
use App\Enums\ParticipantStatus;
use App\Enums\PatunganStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\WalletLedger;
use App\Models\WebhookLog;
use App\Payments\Doku\DokuSignature;
use App\Services\LedgerService;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Support\PatunganFixtures;
use Tests\Support\UsesDoku;
use Tests\TestCase;

class DokuWebhookTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase, UsesDoku;

    protected function setUp(): void
    {
        parent::setUp();
        $this->useDoku();
        $this->fakeDokuQrisGenerate();
    }

    protected function tearDown(): void
    {
        $this->tearDownDoku();
        parent::tearDown();
    }

    /** @param array<string, string> $headers */
    private function notify(array $payload, array $headers): TestResponse
    {
        return $this->call(
            'POST',
            route('webhooks.payments', 'doku'),
            [],
            [],
            [],
            $this->serverHeaders($headers),
            json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        );
    }

    /** @param array<string, string> $headers */
    private function serverHeaders(array $headers): array
    {
        $server = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];

        foreach ($headers as $name => $value) {
            $server['HTTP_'.str_replace('-', '_', strtoupper($name))] = $value;
        }

        return $server;
    }

    private function pendingPayment(array $names = ['Andreas']): Payment
    {
        $patungan = $this->makePatungan($this->organizer(), $names);

        return app(PaymentService::class)->createForParticipant($patungan->participants->first());
    }

    public function test_an_asymmetrically_signed_notification_settles_the_payment(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        $this->notify($payload, $this->dokuNotificationHeaders($payload))->assertOk();

        $payment->refresh();

        $this->assertSame(PaymentStatus::Paid, $payment->status);
        $this->assertNotNull($payment->paid_at);
        $this->assertSame(ParticipantStatus::Paid, $payment->participant->fresh()->status);
        // The invoice slot is freed so the unique index no longer blocks anything.
        $this->assertNull($payment->active_participant_id);
    }

    public function test_a_symmetrically_signed_notification_is_also_accepted(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        $this->notify($payload, $this->dokuSymmetricHeaders($payload))->assertOk();

        $this->assertSame(PaymentStatus::Paid, $payment->fresh()->status);
    }

    public function test_the_organizer_is_credited_exactly_once_for_a_settled_payment(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        $this->notify($payload, $this->dokuNotificationHeaders($payload))->assertOk();

        $credits = WalletLedger::query()
            ->where('user_id', $payment->organizer_id)
            ->where('type', LedgerType::PaymentReceived->value)
            ->count();

        $this->assertSame(1, $credits);
        // The payer carries the fees, so the organizer nets the full bill.
        $this->assertSame(25000, app(LedgerService::class)->availableBalance($payment->organizer_id));
    }

    public function test_a_redelivered_notification_never_credits_twice(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        // Same delivery id, sent ten times, exactly as a retry storm would look.
        $headers = $this->dokuNotificationHeaders($payload);

        for ($i = 0; $i < 10; $i++) {
            $this->notify($payload, $headers)->assertOk();
        }

        $this->assertSame(1, WalletLedger::query()
            ->where('user_id', $payment->organizer_id)
            ->where('type', LedgerType::PaymentReceived->value)
            ->count());

        // The payer carries the fees, so the organizer nets the full bill.
        $this->assertSame(25000, app(LedgerService::class)->availableBalance($payment->organizer_id));
    }

    public function test_a_redelivery_with_a_fresh_delivery_id_still_credits_only_once(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        // Different X-EXTERNAL-ID each time, so the database dedup does not fire
        // and the idempotent apply is what has to hold the line.
        for ($i = 0; $i < 5; $i++) {
            $this->notify($payload, $this->dokuNotificationHeaders($payload))->assertOk();
        }

        $this->assertSame(1, WalletLedger::query()
            ->where('user_id', $payment->organizer_id)
            ->where('type', LedgerType::PaymentReceived->value)
            ->count());
    }

    public function test_a_notification_with_a_forged_signature_is_rejected(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        $headers = $this->dokuNotificationHeaders($payload);
        $headers['X-SIGNATURE'] = base64_encode('not-a-real-signature');

        $this->notify($payload, $headers)->assertOk();

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertSame(WebhookLog::STATUS_REJECTED, WebhookLog::query()->latest('id')->first()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_a_notification_signed_by_the_wrong_key_is_rejected(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        $attacker = $this->rsaKeyPair();
        $timestamp = DokuSignature::timestamp();

        $headers = $this->dokuNotificationHeaders($payload, $timestamp);
        $headers['X-SIGNATURE'] = DokuSignature::asymmetric($this->dokuClientId, $timestamp, $attacker['private']);

        $this->notify($payload, $headers)->assertOk();

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_a_notification_without_a_signature_is_rejected(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        $this->notify($payload, ['X-EXTERNAL-ID' => '123456789'])->assertOk();

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_a_stale_timestamp_is_rejected_even_with_a_valid_signature(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        // Correctly signed, but replayed a day later.
        $stale = DokuSignature::timestamp(now()->subDay());

        $this->notify($payload, $this->dokuNotificationHeaders($payload, $stale))->assertOk();

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_a_notification_from_another_partner_id_is_rejected(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);

        $headers = $this->dokuNotificationHeaders($payload);
        $headers['X-PARTNER-ID'] = 'SOMEONE-ELSE';

        $this->notify($payload, $headers)->assertOk();

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
    }

    public function test_an_amount_that_disagrees_with_the_invoice_is_never_credited(): void
    {
        $payment = $this->pendingPayment();

        // Correctly signed, but claiming ten times the real bill.
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount * 10);

        $this->notify($payload, $this->dokuNotificationHeaders($payload))->assertOk();

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
        $this->assertSame(WebhookLog::STATUS_REJECTED, WebhookLog::query()->latest('id')->first()->status);
    }

    public function test_an_unknown_reference_is_ignored_without_crashing(): void
    {
        $payload = $this->dokuNotificationPayload('PTG-000000-NOTOURS', 25000);

        $this->notify($payload, $this->dokuNotificationHeaders($payload))->assertOk();

        $this->assertSame(WebhookLog::STATUS_IGNORED, WebhookLog::query()->latest('id')->first()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_a_payload_that_is_not_a_payment_notification_is_ignored(): void
    {
        $payload = ['hello' => 'world'];

        $this->notify($payload, $this->dokuNotificationHeaders($payload))->assertOk();

        $this->assertSame(WebhookLog::STATUS_IGNORED, WebhookLog::query()->latest('id')->first()->status);
    }

    public function test_a_failed_status_returns_the_participant_to_unpaid(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount, status: '06');

        $this->notify($payload, $this->dokuNotificationHeaders($payload))->assertOk();

        $this->assertSame(PaymentStatus::Failed, $payment->fresh()->status);
        $this->assertSame(ParticipantStatus::Unpaid, $payment->participant->fresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_the_patungan_completes_once_the_last_participant_pays(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas', 'Niko']);
        $service = app(PaymentService::class);

        foreach ($patungan->participants as $participant) {
            $payment = $service->createForParticipant($participant);
            $payload = $this->dokuNotificationPayload(
                $payment->gateway_reference,
                $payment->charged_amount,
                referenceNo: $payment->gateway_transaction_id,
            );

            $this->notify($payload, $this->dokuNotificationHeaders($payload))->assertOk();
        }

        $patungan->refresh();

        $this->assertSame(PatunganStatus::Completed, $patungan->status);
        $this->assertNotNull($patungan->completed_at);
        $this->assertSame(2, $patungan->paid_participant_count);
        $this->assertSame(50000, $patungan->collected_amount);
    }

    public function test_the_stored_webhook_log_carries_no_secrets(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->dokuNotificationPayload($payment->gateway_reference, $payment->charged_amount);
        $headers = $this->dokuNotificationHeaders($payload);

        $this->notify($payload, $headers)->assertOk();

        $log = WebhookLog::query()->latest('id')->first();
        $encoded = json_encode($log->payload);

        $this->assertStringNotContainsString($this->dokuClientSecret, (string) $encoded);
        $this->assertStringNotContainsString($headers['X-SIGNATURE'], (string) $encoded);
        // The delivery id is kept: it is how a redelivery is recognised.
        $this->assertSame($headers['X-EXTERNAL-ID'], $log->request_id);
    }
}
