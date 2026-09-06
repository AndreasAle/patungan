<?php

namespace Tests\Feature;

use App\Enums\ParticipantStatus;
use App\Enums\PatunganStatus;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class PaymentFlowTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_participant_can_open_a_qris_invoice_without_logging_in(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        $this->post(route('public.payment.store', [$patungan->public_token, $participant->uuid]))
            ->assertRedirect();

        $payment = Payment::query()->firstOrFail();

        $this->assertSame(PaymentStatus::Pending, $payment->status);
        $this->assertSame(25000, $payment->amount);
        $this->assertNotNull($payment->gateway_transaction_id);
        $this->assertSame(ParticipantStatus::Pending, $participant->fresh()->status);
    }

    public function test_the_amount_comes_from_the_database_and_ignores_client_input(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        $this->post(route('public.payment.store', [$patungan->public_token, $participant->uuid]), [
            'amount' => 1,
            'charged_amount' => 1,
            'net_amount' => 999999,
        ])->assertRedirect();

        $payment = Payment::query()->firstOrFail();

        $this->assertSame(25000, $payment->amount);
        $this->assertSame(25000, $payment->charged_amount);
    }

    public function test_fees_are_calculated_in_whole_rupiah(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        $payment = app(PaymentService::class)->createForParticipant($participant);

        // 0.70% of 25.000 = 175, plus a flat platform fee of 250.
        $this->assertSame(175, $payment->gateway_fee);
        $this->assertSame(250, $payment->platform_fee);
        $this->assertSame(425, $payment->fee);
        $this->assertSame(24575, $payment->net_amount);
    }

    public function test_a_participant_can_hold_only_one_active_invoice(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();
        $service = app(PaymentService::class);

        $first = $service->createForParticipant($participant);
        $second = $service->createForParticipant($participant->fresh());

        $this->assertSame($first->id, $second->id);
        $this->assertSame(1, Payment::query()->count());
    }

    public function test_a_paid_participant_cannot_start_another_payment(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        $payment = app(PaymentService::class)->createForParticipant($participant);
        $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment))->assertOk();

        $this->post(route('public.payment.store', [$patungan->public_token, $participant->uuid]))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame(1, Payment::query()->count());
    }

    public function test_an_expired_invoice_can_be_replaced_with_a_new_one(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();
        $service = app(PaymentService::class);

        $first = $service->createForParticipant($participant);
        $first->forceFill(['expires_at' => now()->subMinute()])->save();

        $second = $service->createForParticipant($participant->fresh());

        $this->assertNotSame($first->id, $second->id);
        $this->assertSame(PaymentStatus::Expired, $first->fresh()->status);
        $this->assertSame(PaymentStatus::Pending, $second->status);
    }

    public function test_expire_command_frees_stale_invoices(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        $payment = app(PaymentService::class)->createForParticipant($participant);
        $payment->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->artisan('payments:expire')->assertSuccessful();

        $this->assertSame(PaymentStatus::Expired, $payment->fresh()->status);
        $this->assertSame(ParticipantStatus::Unpaid, $participant->fresh()->status);
    }

    public function test_a_closed_patungan_refuses_new_payments(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $patungan->forceFill(['status' => PatunganStatus::Closed->value])->save();
        $participant = $patungan->participants->first();

        $this->post(route('public.payment.store', [$patungan->public_token, $participant->uuid]))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame(0, Payment::query()->count());
    }

    public function test_a_participant_from_another_patungan_cannot_be_paid_through_this_link(): void
    {
        $mine = $this->makePatungan($this->organizer(), ['Andreas']);
        $theirs = $this->makePatungan($this->organizer(), ['Niko']);

        $this->post(route('public.payment.store', [$mine->public_token, $theirs->participants->first()->uuid]))
            ->assertNotFound();
    }

    public function test_payment_status_endpoint_reports_the_stored_status(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        $this->getJson(route('public.payment.status', [$patungan->public_token, $payment->uuid]))
            ->assertOk()
            ->assertJsonPath('status', 'PENDING');
    }
}
