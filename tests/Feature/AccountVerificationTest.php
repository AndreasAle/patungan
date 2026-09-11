<?php

namespace Tests\Feature;

use App\Contracts\AccountInquiry;
use App\Enums\AccountVerificationStatus;
use App\Models\PayoutDestination;
use App\Models\User;
use App\Payouts\AccountInquiryManager;
use App\Payouts\AccountInquiryResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Verifying that a payout destination really belongs to the person adding it.
 *
 * The terms have always said a destination must be in the organizer's own
 * name. These are the tests that make that sentence mean something.
 */
class AccountVerificationTest extends TestCase
{
    use RefreshDatabase;

    /** Swaps in a bank that answers however this test needs it to. */
    private function bankSays(AccountInquiryResult $result, bool $available = true): void
    {
        $this->app->bind(AccountInquiry::class, fn () => new class($result, $available) implements AccountInquiry
        {
            public function __construct(private readonly AccountInquiryResult $result, private readonly bool $available) {}

            public function name(): string
            {
                return 'fake';
            }

            public function isAvailable(): bool
            {
                return $this->available;
            }

            public function inquire(string $providerCode, string $accountNumber): AccountInquiryResult
            {
                return $this->result;
            }
        });

        $this->app->bind(AccountInquiryManager::class, fn ($app) => new class($app->make(AccountInquiry::class)) extends AccountInquiryManager
        {
            public function __construct(private readonly AccountInquiry $inquiry) {}

            public function driver(): AccountInquiry
            {
                return $this->inquiry;
            }
        });
    }

    private function organizer(string $name = 'Andreas Alessandro Fernandito'): User
    {
        return User::factory()->create(['name' => $name]);
    }

    /** @return array<string, string> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'type' => 'BANK',
            'provider_code' => 'bca',
            'account_number' => '1234567890',
            'account_holder' => 'Andreas Alessandro Fernandito',
        ], $overrides);
    }

    public function test_it_returns_the_name_the_bank_holds(): void
    {
        $this->bankSays(AccountInquiryResult::found('ANDREAS ALESSANDRO FERNANDITO'));

        $this->actingAs($this->organizer())
            ->postJson(route('payout.destination.verify'), $this->payload())
            ->assertOk()
            ->assertJson([
                'status' => AccountVerificationStatus::Verified->value,
                'account_holder' => 'ANDREAS ALESSANDRO FERNANDITO',
                'found' => true,
            ]);
    }

    public function test_somebody_else_s_account_is_flagged_not_silently_accepted(): void
    {
        $this->bankSays(AccountInquiryResult::found('BUDI SANTOSO'));

        $this->actingAs($this->organizer())
            ->postJson(route('payout.destination.verify'), $this->payload())
            ->assertOk()
            ->assertJson(['status' => AccountVerificationStatus::Mismatch->value]);
    }

    public function test_a_provider_outage_is_never_reported_as_a_wrong_account_number(): void
    {
        /*
         * The distinction people act on. "Your account number is wrong" sends
         * somebody to their bank to fix a problem that is ours.
         */
        $this->bankSays(AccountInquiryResult::unavailable('Provider down'));

        $this->actingAs($this->organizer())
            ->postJson(route('payout.destination.verify'), $this->payload())
            ->assertOk()
            ->assertJson(['status' => AccountVerificationStatus::Unavailable->value, 'found' => false]);
    }

    public function test_an_account_the_bank_does_not_know_is_reported_as_not_found(): void
    {
        $this->bankSays(AccountInquiryResult::notFound());

        $this->actingAs($this->organizer())
            ->postJson(route('payout.destination.verify'), $this->payload())
            ->assertOk()
            ->assertJson(['status' => AccountVerificationStatus::Unverified->value, 'found' => false]);
    }

    public function test_the_stored_verdict_comes_from_the_server_not_the_browser(): void
    {
        $this->bankSays(AccountInquiryResult::found('BUDI SANTOSO'));

        $organizer = $this->organizer();

        // The browser claims a match, and a name to go with it.
        $this->actingAs($organizer)->post(route('payout.destination.store'), $this->payload([
            'account_holder' => 'Andreas Alessandro Fernandito',
        ]));

        $destination = PayoutDestination::query()->firstOrFail();

        $this->assertSame(AccountVerificationStatus::Mismatch, $destination->verification_status);
        // The bank's answer wins over what was typed.
        $this->assertSame('BUDI SANTOSO', $destination->account_holder);
        $this->assertSame('BUDI SANTOSO', $destination->verified_account_holder);
        $this->assertNull($destination->verified_at);
    }

    public function test_a_verified_destination_records_when_it_was_checked(): void
    {
        $this->bankSays(AccountInquiryResult::found('ANDREAS FERNANDITO'));

        $this->actingAs($this->organizer())->post(route('payout.destination.store'), $this->payload());

        $destination = PayoutDestination::query()->firstOrFail();

        $this->assertSame(AccountVerificationStatus::Verified, $destination->verification_status);
        $this->assertNotNull($destination->verified_at);
    }

    public function test_destinations_can_still_be_added_when_nobody_can_verify(): void
    {
        /*
         * A payout screen that cannot accept a destination is worse than one
         * that cannot verify it: the first traps somebody's money, the second
         * only leaves a badge off.
         */
        $this->bankSays(AccountInquiryResult::unavailable(), available: false);

        $this->actingAs($this->organizer())
            ->post(route('payout.destination.store'), $this->payload())
            ->assertRedirect();

        $destination = PayoutDestination::query()->firstOrFail();

        $this->assertSame(AccountVerificationStatus::Unavailable, $destination->verification_status);
        $this->assertSame('Andreas Alessandro Fernandito', $destination->account_holder);
    }

    public function test_verification_needs_a_signed_in_organizer(): void
    {
        $this->bankSays(AccountInquiryResult::found('ANDREAS FERNANDITO'));

        $this->postJson(route('payout.destination.verify'), $this->payload())->assertUnauthorized();
    }

    public function test_an_unknown_bank_code_is_refused(): void
    {
        $this->bankSays(AccountInquiryResult::found('ANDREAS FERNANDITO'));

        $this->actingAs($this->organizer())
            ->postJson(route('payout.destination.verify'), $this->payload(['provider_code' => 'not-a-bank']))
            ->assertStatus(422);
    }
}
