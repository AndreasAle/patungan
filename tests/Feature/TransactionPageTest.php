<?php

namespace Tests\Feature;

use App\Enums\LedgerDirection;
use App\Enums\LedgerType;
use App\Models\User;
use App\Models\WalletLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class TransactionPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_an_organizer_sees_an_empty_transaction_summary(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('transactions.index'))->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->component('transaksi')
                ->where('summary.balance', 0)
                ->where('summary.incoming', 0)
                ->where('summary.outgoing', 0)
                ->where('entries.total', 0)
        );
    }

    public function test_the_transaction_summary_uses_the_entire_organizer_ledger(): void
    {
        $user = User::factory()->create();
        $other = User::factory()->create();

        $this->entry($user, LedgerDirection::Credit, 150000, 'credit-one');
        $this->entry($user, LedgerDirection::Credit, 50000, 'credit-two');
        $this->entry($user, LedgerDirection::Debit, 75000, 'debit-one');
        $this->entry($other, LedgerDirection::Credit, 999999, 'somebody-else');

        $this->actingAs($user)->get(route('transactions.index'))->assertOk()->assertInertia(
            fn (Assert $page) => $page
                ->where('summary.balance', 125000)
                ->where('summary.incoming', 200000)
                ->where('summary.outgoing', 75000)
                ->where('entries.total', 3)
        );
    }

    private function entry(User $user, LedgerDirection $direction, int $amount, string $reference): void
    {
        WalletLedger::query()->create([
            'user_id' => $user->id,
            'type' => $direction === LedgerDirection::Credit ? LedgerType::PaymentReceived : LedgerType::Payout,
            'direction' => $direction,
            'amount' => $amount,
            'balance_after' => null,
            'reference' => $reference,
            'description' => 'Test transaction',
        ]);
    }
}
