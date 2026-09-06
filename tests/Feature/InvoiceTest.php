<?php

namespace Tests\Feature;

use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class InvoiceTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_a_qris_payment_issues_an_invoice_for_the_participant(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();
        $payment = app(PaymentService::class)->createForParticipant($participant);

        $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment))->assertOk();

        $participant->refresh();

        $this->assertNotNull($participant->invoice_number);
        $this->assertStringStartsWith('INV-', $participant->invoice_number);

        $this->get(route('public.invoice.show', [$patungan->public_token, $participant->uuid]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('public/invoice')
                ->where('invoice.number', $participant->invoice_number)
                ->where('invoice.amount', 25000)
                ->where('invoice.participant_name', 'Andreas')
                ->where('invoice.method', 'QRIS'));
    }

    public function test_a_cash_payment_also_issues_an_invoice_marked_as_manual(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas', 'Niko']);
        $participant = $patungan->participants->first();

        $this->actingAs($organizer)->post(route('participant.mark-paid', [$patungan->uuid, $participant->uuid]));

        $participant->refresh();
        $this->assertNotNull($participant->invoice_number);

        $this->get(route('public.invoice.show', [$patungan->public_token, $participant->uuid]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('invoice.is_manual', true)->where('invoice.method', 'MANUAL'));
    }

    public function test_an_unpaid_participant_has_no_invoice(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);

        $this->get(route('public.invoice.show', [$patungan->public_token, $patungan->participants->first()->uuid]))
            ->assertNotFound();
    }

    public function test_invoice_numbers_are_unique_across_participants(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas', 'Niko', 'Obet']);
        $service = app(PaymentService::class);

        foreach ($patungan->participants as $participant) {
            $payment = $service->createForParticipant($participant);
            $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment))->assertOk();
        }

        $numbers = $patungan->participants()->pluck('invoice_number');

        $this->assertCount(3, $numbers->filter());
        $this->assertCount(3, $numbers->unique());
    }

    public function test_a_replayed_webhook_does_not_reissue_the_invoice_number(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();
        $payment = app(PaymentService::class)->createForParticipant($participant);
        $payload = $this->webhookPayload($payment);

        $this->postJson(route('webhooks.payments', 'sandbox'), $payload)->assertOk();
        $issued = $participant->fresh()->invoice_number;

        $this->postJson(route('webhooks.payments', 'sandbox'), $payload)->assertOk();

        $this->assertSame($issued, $participant->fresh()->invoice_number);
    }

    public function test_withdrawing_a_manual_payment_voids_the_invoice(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas', 'Niko']);
        $participant = $patungan->participants->first();

        $this->actingAs($organizer)->post(route('participant.mark-paid', [$patungan->uuid, $participant->uuid]));
        $this->assertNotNull($participant->fresh()->invoice_number);

        $this->actingAs($organizer)->delete(route('participant.unmark-paid', [$patungan->uuid, $participant->uuid]));

        $this->assertNull($participant->fresh()->invoice_number);
        $this->get(route('public.invoice.show', [$patungan->public_token, $participant->uuid]))->assertNotFound();
    }

    public function test_the_invoice_never_exposes_the_gateway_reference(): void
    {
        $organizer = $this->organizer(['email' => 'rahasia@patungan.test']);
        $patungan = $this->makePatungan($organizer, ['Andreas']);
        $participant = $patungan->participants->first();
        $payment = app(PaymentService::class)->createForParticipant($participant);

        $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment))->assertOk();

        $response = $this->get(route('public.invoice.show', [$patungan->public_token, $participant->uuid]));

        $response->assertOk();
        $response->assertDontSee($payment->gateway_reference);
        $response->assertDontSee($payment->gateway_transaction_id);
        $response->assertDontSee('rahasia@patungan.test');
    }

    public function test_a_participant_uuid_from_another_patungan_is_not_found(): void
    {
        $mine = $this->makePatungan($this->organizer(), ['Andreas']);
        $theirs = $this->makePatungan($this->organizer(), ['Niko']);

        $this->get(route('public.invoice.show', [$mine->public_token, $theirs->participants->first()->uuid]))
            ->assertNotFound();
    }
}
