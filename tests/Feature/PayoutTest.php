<?php

namespace Tests\Feature;

use App\Enums\SettlementStatus;
use App\Models\PayoutDestination;
use App\Models\Settlement;
use App\Models\User;
use App\Services\LedgerService;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class PayoutTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    /** Collects one real payment so the organizer has an auditable balance. */
    private function organizerWithBalance(): User
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment))->assertOk();

        return $organizer;
    }

    public function test_organizer_can_request_a_payout_up_to_their_balance(): void
    {
        $organizer = $this->organizerWithBalance();
        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);

        $this->actingAs($organizer)
            ->post(route('payout.store'), ['payout_destination_id' => $destination->id, 'amount' => 20000])
            ->assertRedirect();

        $settlement = Settlement::query()->firstOrFail();

        $this->assertSame($organizer->id, $settlement->organizer_id);
        $this->assertSame(20000, $settlement->amount);
        $this->assertSame(SettlementStatus::Pending, $settlement->status);
        // The debit lands with the request, so the balance drops immediately.
        $this->assertSame(4575, app(LedgerService::class)->availableBalance($organizer));
        $this->assertSame(20000, app(LedgerService::class)->totalPaidOut($organizer));
    }

    public function test_a_payout_larger_than_the_balance_is_refused(): void
    {
        $organizer = $this->organizerWithBalance();
        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);

        $this->actingAs($organizer)
            ->post(route('payout.store'), ['payout_destination_id' => $destination->id, 'amount' => 999999])
            ->assertSessionHasErrors('amount');

        $this->assertSame(0, Settlement::query()->count());
        $this->assertSame(24575, app(LedgerService::class)->availableBalance($organizer));
    }

    public function test_an_organizer_cannot_pay_out_to_someone_elses_destination(): void
    {
        $organizer = $this->organizerWithBalance();
        $stranger = PayoutDestination::factory()->create(['user_id' => $this->organizer()->id]);

        $this->actingAs($organizer)
            ->post(route('payout.store'), ['payout_destination_id' => $stranger->id, 'amount' => 10000])
            ->assertSessionHasErrors('payout_destination_id');

        $this->assertSame(0, Settlement::query()->count());
    }

    public function test_admin_completing_a_payout_keeps_the_balance_deducted(): void
    {
        $organizer = $this->organizerWithBalance();
        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);

        $this->actingAs($organizer)->post(route('payout.store'), ['payout_destination_id' => $destination->id, 'amount' => 20000]);
        $settlement = Settlement::query()->firstOrFail();

        $this->actingAs($this->admin())
            ->post(route('admin.settlements.update', $settlement->uuid), ['action' => 'complete', 'provider_reference' => 'TRF-123'])
            ->assertRedirect();

        $settlement->refresh();

        $this->assertSame(SettlementStatus::Completed, $settlement->status);
        $this->assertSame('TRF-123', $settlement->provider_reference);
        $this->assertSame(4575, app(LedgerService::class)->availableBalance($organizer));
    }

    public function test_a_failed_payout_returns_the_funds_to_the_organizer(): void
    {
        $organizer = $this->organizerWithBalance();
        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);

        $this->actingAs($organizer)->post(route('payout.store'), ['payout_destination_id' => $destination->id, 'amount' => 20000]);
        $settlement = Settlement::query()->firstOrFail();

        $this->actingAs($this->admin())
            ->post(route('admin.settlements.update', $settlement->uuid), ['action' => 'fail', 'reason' => 'Rekening tidak ditemukan'])
            ->assertRedirect();

        $this->assertSame(SettlementStatus::Failed, $settlement->fresh()->status);
        $this->assertSame(24575, app(LedgerService::class)->availableBalance($organizer));
        $this->assertSame(0, app(LedgerService::class)->totalPaidOut($organizer));
    }

    public function test_a_regular_user_cannot_process_settlements(): void
    {
        $organizer = $this->organizerWithBalance();
        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);

        $this->actingAs($organizer)->post(route('payout.store'), ['payout_destination_id' => $destination->id, 'amount' => 20000]);
        $settlement = Settlement::query()->firstOrFail();

        $this->actingAs($organizer)
            ->post(route('admin.settlements.update', $settlement->uuid), ['action' => 'complete'])
            ->assertForbidden();

        $this->assertSame(SettlementStatus::Pending, $settlement->fresh()->status);
    }

    public function test_payout_destinations_are_stored_masked_on_the_settlement(): void
    {
        $organizer = $this->organizerWithBalance();
        $destination = PayoutDestination::factory()->create([
            'user_id' => $organizer->id,
            'account_number' => '1234568291',
            'provider_label' => 'BCA',
        ]);

        $this->actingAs($organizer)->post(route('payout.store'), ['payout_destination_id' => $destination->id, 'amount' => 20000]);

        $this->assertSame('BCA ******8291', Settlement::query()->firstOrFail()->destination_account_reference);
    }
}
