<?php

namespace Tests\Feature;

use App\Enums\LedgerType;
use App\Enums\ParticipantStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\WalletLedger;
use App\Models\WebhookLog;
use App\Payments\Dana\DanaSignature;
use App\Services\LedgerService;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\Support\PatunganFixtures;
use Tests\Support\UsesDana;
use Tests\TestCase;

/**
 * The DANA notification endpoint is public: anyone can post to it. Everything
 * here is about what happens when they do.
 */
class DanaWebhookTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase, UsesDana;

    protected function setUp(): void
    {
        parent::setUp();
        $this->useDana();
        $this->fakeDanaQrisGenerate();
    }

    protected function tearDown(): void
    {
        $this->tearDownDana();
        parent::tearDown();
    }

    /** @param array<string, string> $headers */
    private function notify(array $payload, array $headers): TestResponse
    {
        return $this->call(
            'POST',
            route('webhooks.payments', 'dana'),
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

    public function test_an_unsigned_probe_is_rejected_without_loading_dana_credentials(): void
    {
        config()->set([
            'dana.partner_id' => null,
            'dana.base_url' => null,
            'dana.private_key_path' => null,
        ]);

        $this->notify([], [])
            ->assertUnauthorized()
            ->assertJson([
                'responseCode' => '4015600',
                'responseMessage' => 'Unauthorized',
            ]);
    }

    public function test_sandbox_uat_can_simulate_the_required_internal_server_error_acknowledgement(): void
    {
        config()->set('dana.uat.force_notify_error', true);

        $response = $this->notify([], [
            'X-SIGNATURE' => 'sandbox-uat-placeholder',
            'X-TIMESTAMP' => DanaSignature::timestamp(),
        ]);

        $response->assertStatus(500)->assertJson([
            'responseCode' => '5005601',
            'responseMessage' => 'Internal Server Error',
        ]);
        $this->assertSame(0, WebhookLog::query()->count());
    }

    public function test_the_uat_failure_switch_is_ignored_in_production(): void
    {
        config()->set([
            'dana.environment' => 'production',
            'dana.base_url' => 'https://api.dana.id',
            'dana.uat.force_notify_error' => true,
        ]);

        $payload = ['hello' => 'world'];
        $this->notify($payload, $this->danaNotificationHeaders($payload))
            ->assertOk()
            ->assertJson(['responseCode' => '2005600']);
    }

    public function test_the_finish_redirect_page_is_public_and_does_not_claim_payment_succeeded(): void
    {
        $this->get(route('public.payment.dana.finish'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('public/dana-finish'))
            ->assertDontSee('Pembayaran berhasil', false);
    }

    public function test_a_signed_notification_settles_the_payment(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount);

        $response = $this->notify($payload, $this->danaNotificationHeaders($payload));

        $response->assertOk();
        // DANA reads the body, not just the status. Anything it does not
        // recognise is filed as pending and redelivered for seven days.
        $response->assertJson(['responseCode' => '2005600', 'responseMessage' => 'Successful']);

        $payment->refresh();
        $this->assertSame(PaymentStatus::Paid, $payment->status);
        $this->assertSame(ParticipantStatus::Paid, $payment->participant->refresh()->status);
    }

    public function test_replaying_the_same_notification_credits_the_organizer_once(): void
    {
        $payment = $this->pendingPayment();
        $organizer = $payment->organizer;
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount);

        // DANA retries for seven days on anything it reads as pending, so a
        // repeat is normal traffic and not an attack.
        $this->notify($payload, $this->danaNotificationHeaders($payload))->assertOk();
        $this->notify($payload, $this->danaNotificationHeaders($payload))->assertOk();

        $this->assertSame(
            1,
            WalletLedger::query()
                ->where('user_id', $organizer->id)
                ->where('type', LedgerType::PaymentReceived->value)
                ->count(),
        );

        $this->assertSame(1, WebhookLog::query()->where('status', WebhookLog::STATUS_PROCESSED)->count());
    }

    public function test_an_unsigned_notification_never_moves_money(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount);

        $this->notify($payload, [
            'X-SIGNATURE' => base64_encode('nonsense'),
            'X-TIMESTAMP' => DanaSignature::timestamp(),
            'X-PARTNER-ID' => $this->danaPartnerId,
            'X-EXTERNAL-ID' => '1234567890',
            'CHANNEL-ID' => '95221',
        ]);

        $this->assertSame(PaymentStatus::Pending, $payment->refresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
        $this->assertSame(1, WebhookLog::query()->where('status', WebhookLog::STATUS_REJECTED)->count());
    }

    public function test_a_notification_signed_by_the_wrong_key_is_refused(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount);

        // Somebody with a valid RSA key that simply is not DANA's.
        $imposter = $this->rsaKeyPair();

        $this->notify($payload, $this->danaNotificationHeaders($payload, privateKey: $imposter['private']));

        $this->assertSame(PaymentStatus::Pending, $payment->refresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_a_tampered_amount_breaks_the_signature(): void
    {
        $payment = $this->pendingPayment();
        $honest = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount);
        $headers = $this->danaNotificationHeaders($honest);

        // Same signature, larger amount: the exact attack the signature exists
        // to stop.
        $tampered = $honest;
        $tampered['amount']['value'] = '99999999.00';

        $this->notify($tampered, $headers);

        $this->assertSame(PaymentStatus::Pending, $payment->refresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_a_stale_timestamp_is_refused_even_when_correctly_signed(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount);

        $stale = DanaSignature::timestamp(now()->subHours(2));

        $this->notify($payload, $this->danaNotificationHeaders($payload, timestamp: $stale));

        $this->assertSame(PaymentStatus::Pending, $payment->refresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_a_notification_from_another_partner_id_is_refused(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount);

        $headers = $this->danaNotificationHeaders($payload);
        $headers['X-PARTNER-ID'] = 'SOMEBODY-ELSE';

        $this->notify($payload, $headers);

        $this->assertSame(PaymentStatus::Pending, $payment->refresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_an_amount_that_disagrees_with_the_invoice_is_never_credited(): void
    {
        $payment = $this->pendingPayment();

        // Correctly signed, genuinely from DANA, but for the wrong figure. The
        // ledger must not follow the provider over our own record.
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount + 50_000);

        $this->notify($payload, $this->danaNotificationHeaders($payload));

        $this->assertSame(PaymentStatus::Pending, $payment->refresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_a_cancelled_status_returns_the_participant_to_unpaid(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount, status: '05');

        $this->notify($payload, $this->danaNotificationHeaders($payload))->assertOk();

        $payment->refresh();
        $this->assertSame(PaymentStatus::Cancelled, $payment->status);
        $this->assertSame(ParticipantStatus::Unpaid, $payment->participant->refresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_an_unknown_reference_is_acknowledged_without_crashing(): void
    {
        $payload = $this->danaNotificationPayload('PTG-DOES-NOT-EXIST', 25_000);

        $response = $this->notify($payload, $this->danaNotificationHeaders($payload));

        // Answered rather than errored: a 5xx would make DANA redeliver
        // something we will never be able to act on.
        $response->assertOk();
        $response->assertJson(['responseCode' => '2005600']);
    }

    public function test_a_payload_that_is_not_a_payment_notification_is_ignored(): void
    {
        $payload = ['hello' => 'world'];

        $this->notify($payload, $this->danaNotificationHeaders($payload))->assertOk();

        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_the_balance_reflects_exactly_one_settlement(): void
    {
        $payment = $this->pendingPayment();
        $organizer = $payment->organizer;
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount);

        $this->notify($payload, $this->danaNotificationHeaders($payload))->assertOk();
        $this->notify($payload, $this->danaNotificationHeaders($payload))->assertOk();

        // The organizer receives the invoice amount, not the charged amount:
        // the fee is what sits between them.
        $this->assertSame(
            (int) $payment->refresh()->amount,
            app(LedgerService::class)->availableBalance($organizer->refresh()),
        );
    }

    public function test_the_stored_webhook_log_carries_no_secrets(): void
    {
        $payment = $this->pendingPayment();
        $payload = $this->danaNotificationPayload($payment->gateway_reference, (int) $payment->charged_amount);

        $this->notify($payload, $this->danaNotificationHeaders($payload));

        $encoded = WebhookLog::query()->firstOrFail()->toJson();

        $this->assertStringNotContainsString('BEGIN', $encoded);
        $this->assertStringNotContainsString($this->ourDanaKeys['private'], $encoded);
    }
}
