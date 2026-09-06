<?php

namespace Tests\Feature;

use App\Enums\LedgerType;
use App\Enums\ParticipantStatus;
use App\Enums\PatunganStatus;
use App\Enums\PaymentStatus;
use App\Models\WalletLedger;
use App\Models\WebhookLog;
use App\Services\LedgerService;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class PaymentWebhookTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_a_valid_webhook_marks_the_payment_and_participant_paid(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas', 'Niko']);
        $participant = $patungan->participants->first();
        $payment = app(PaymentService::class)->createForParticipant($participant);

        $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment))->assertOk();

        $this->assertSame(PaymentStatus::Paid, $payment->fresh()->status);
        $this->assertSame(ParticipantStatus::Paid, $participant->fresh()->status);
        $this->assertSame(25000, $participant->fresh()->amount_paid);

        $patungan->refresh();
        $this->assertSame(25000, $patungan->collected_amount);
        $this->assertSame(1, $patungan->paid_participant_count);

        // Ledger: one credit plus the two fee debits.
        $this->assertSame(24575, app(LedgerService::class)->availableBalance($organizer));
        $this->assertSame(3, WalletLedger::query()->count());
    }

    public function test_a_replayed_webhook_never_credits_twice(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());
        $payload = $this->webhookPayload($payment);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson(route('webhooks.payments', 'sandbox'), $payload)->assertOk();
        }

        $this->assertSame(24575, app(LedgerService::class)->availableBalance($organizer));
        $this->assertSame(3, WalletLedger::query()->count());
        $this->assertSame(25000, $patungan->fresh()->collected_amount);
        $this->assertSame(1, WebhookLog::query()->where('status', WebhookLog::STATUS_PROCESSED)->count());
        $this->assertSame(4, WebhookLog::query()->where('status', WebhookLog::STATUS_DUPLICATE)->count());
    }

    public function test_a_webhook_with_an_invalid_signature_is_rejected(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        $payload = $this->webhookPayload($payment);
        $payload['signature_key'] = str_repeat('0', 128);

        $this->postJson(route('webhooks.payments', 'sandbox'), $payload)->assertOk();

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertSame(0, app(LedgerService::class)->availableBalance($organizer));
        $this->assertDatabaseHas('webhook_logs', ['status' => WebhookLog::STATUS_REJECTED, 'signature_valid' => false]);
    }

    public function test_a_webhook_whose_amount_does_not_match_the_invoice_is_rejected(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment, 'settlement', '1000.00'))
            ->assertOk();

        $this->assertSame(PaymentStatus::Pending, $payment->fresh()->status);
        $this->assertSame(0, app(LedgerService::class)->availableBalance($organizer));
        $this->assertDatabaseHas('webhook_logs', ['status' => WebhookLog::STATUS_REJECTED]);
    }

    public function test_an_expire_webhook_returns_the_participant_to_unpaid(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();
        $payment = app(PaymentService::class)->createForParticipant($participant);

        $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment, 'expire'))->assertOk();

        $this->assertSame(PaymentStatus::Expired, $payment->fresh()->status);
        $this->assertSame(ParticipantStatus::Unpaid, $participant->fresh()->status);
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_the_patungan_completes_once_every_participant_has_paid(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas', 'Niko']);
        $service = app(PaymentService::class);

        foreach ($patungan->participants as $participant) {
            $payment = $service->createForParticipant($participant);
            $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment))->assertOk();
        }

        $patungan->refresh();

        $this->assertSame(PatunganStatus::Completed, $patungan->status);
        $this->assertNotNull($patungan->completed_at);
        $this->assertSame(50000, $patungan->collected_amount);
        $this->assertSame(49150, app(LedgerService::class)->availableBalance($organizer));
        $this->assertSame(500, (int) WalletLedger::query()->where('type', LedgerType::PlatformFee->value)->sum('amount'));
    }

    public function test_an_unknown_reference_is_logged_and_ignored(): void
    {
        $this->postJson(route('webhooks.payments', 'sandbox'), [
            'order_id' => 'PTG-000000-UNKNOWN',
            'transaction_id' => 'x',
            'status_code' => '200',
            'gross_amount' => '25000.00',
            'transaction_status' => 'settlement',
            'signature_key' => str_repeat('a', 128),
        ])->assertOk();

        $this->assertSame(0, WalletLedger::query()->count());
        $this->assertSame(1, WebhookLog::query()->count());
    }
}
