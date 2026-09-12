<?php

namespace Tests\Feature;

use App\Enums\AccountVerificationStatus;
use App\Enums\SettlementStatus;
use App\Models\PayoutDestination;
use App\Models\Settlement;
use App\Models\User;
use App\Payouts\PayoutRiskPolicy;
use App\Services\PaymentService;
use App\Services\SettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

/**
 * When a payout is allowed to leave without a human.
 *
 * The story every test here is written against: somebody gets into an
 * organizer's account, adds their own bank account - in their own real name, so
 * it verifies perfectly - and withdraws. Verification is not what stops that.
 * These are.
 */
class PayoutRiskPolicyTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'patungan.payout.automatic.enabled' => true,
            'patungan.payout.automatic.max_amount' => 1000000,
            'patungan.payout.automatic.cooling_hours' => 24,
        ]);
    }

    private function policy(): PayoutRiskPolicy
    {
        return app(PayoutRiskPolicy::class);
    }

    /** An organizer who has done everything right. */
    private function trustedOrganizer(): User
    {
        return $this->organizer(['phone' => '081234567890', 'phone_verified_at' => now()]);
    }

    private function settledDestination(User $owner): PayoutDestination
    {
        $destination = PayoutDestination::factory()->create(['user_id' => $owner->id]);

        $destination->forceFill([
            'verification_status' => AccountVerificationStatus::Verified->value,
            'verified_at' => now()->subDays(3),
        ])->save();

        return $destination->refresh();
    }

    public function test_a_settled_verified_destination_may_go_automatically(): void
    {
        $organizer = $this->trustedOrganizer();

        $decision = $this->policy()->evaluate($organizer, $this->settledDestination($organizer), 250000);

        $this->assertTrue($decision['automatic']);
        $this->assertSame([], $decision['reasons']);
    }

    public function test_a_freshly_added_destination_waits_out_the_cooling_period(): void
    {
        $organizer = $this->trustedOrganizer();
        $destination = $this->settledDestination($organizer);

        // The takeover case: verified, in a real name, added minutes ago.
        $destination->forceFill(['verified_at' => now()])->save();

        $decision = $this->policy()->evaluate($organizer, $destination->refresh(), 250000);

        $this->assertFalse($decision['automatic'], 'A destination added minutes ago must not drain a balance.');
        $this->assertStringContainsString('menunggu 24 jam', implode(' ', $decision['reasons']));
    }

    public function test_an_unverified_destination_never_goes_automatically(): void
    {
        $organizer = $this->trustedOrganizer();
        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);
        $destination->forceFill(['created_at' => now()->subDays(5)])->save();

        $decision = $this->policy()->evaluate($organizer, $destination->refresh(), 250000);

        $this->assertFalse($decision['automatic']);
    }

    public function test_an_unverified_phone_holds_the_payout(): void
    {
        // Without a second channel there is nowhere to warn the real owner.
        $organizer = $this->organizer(['phone_verified_at' => null]);

        $decision = $this->policy()->evaluate($organizer, $this->settledDestination($organizer), 250000);

        $this->assertFalse($decision['automatic']);
        $this->assertStringContainsString('Nomor HP', implode(' ', $decision['reasons']));
    }

    public function test_an_amount_over_the_ceiling_is_reviewed(): void
    {
        $organizer = $this->trustedOrganizer();

        $decision = $this->policy()->evaluate($organizer, $this->settledDestination($organizer), 1000001);

        $this->assertFalse($decision['automatic'], 'The worst case has to have a ceiling.');
    }

    public function test_every_failing_reason_is_reported_not_just_the_first(): void
    {
        $organizer = $this->organizer(['phone_verified_at' => null]);
        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);

        $decision = $this->policy()->evaluate($organizer, $destination, 5000000);

        /*
         * An operator fixing one blocker only to hit the next is how a person
         * loses faith in a system. All of them are stated at once.
         */
        $this->assertCount(4, $decision['reasons']);
    }

    public function test_a_held_payout_is_queued_rather_than_refused(): void
    {
        $organizer = $this->organizer(['phone_verified_at' => null]);
        $patungan = $this->makePatungan($organizer, ['Sandi']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());
        app(PaymentService::class)->markAsPaid($payment, 'TXN-RISK-1');

        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);

        $settlement = app(SettlementService::class)->request($organizer->refresh(), $destination, 20000);

        /*
         * The money is the organizer's. Caution may cost them time; it must not
         * cost them access.
         */
        $this->assertSame(SettlementStatus::Pending, $settlement->status);
        $this->assertFalse($settlement->metadata['automated']);
        $this->assertNotEmpty($settlement->metadata['review_reasons']);
    }

    public function test_the_reasons_are_frozen_onto_the_settlement(): void
    {
        $organizer = $this->organizer(['phone_verified_at' => null]);
        $patungan = $this->makePatungan($organizer, ['Sandi']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());
        app(PaymentService::class)->markAsPaid($payment, 'TXN-RISK-2');

        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);
        $settlement = app(SettlementService::class)->request($organizer->refresh(), $destination, 20000);

        // The organizer verifies their phone afterwards.
        $organizer->forceFill(['phone_verified_at' => now()])->save();

        /*
         * The record must still say why it was held at the time. Recomputing it
         * later would quietly erase the reason an operator is looking for.
         */
        $this->assertStringContainsString(
            'Nomor HP',
            implode(' ', Settlement::query()->find($settlement->id)->metadata['review_reasons']),
        );
    }

    public function test_nothing_is_automatic_while_the_feature_is_off(): void
    {
        config(['patungan.payout.automatic.enabled' => false]);

        $organizer = $this->trustedOrganizer();

        $this->assertFalse($this->policy()->evaluate($organizer, $this->settledDestination($organizer), 1000)['automatic']);
    }
}
