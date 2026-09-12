<?php

namespace Tests\Feature;

use App\Enums\ParticipantStatus;
use App\Enums\PaymentStatus;
use App\Enums\SettlementStatus;
use App\Models\Payment;
use App\Models\PayoutDestination;
use App\Models\Settlement;
use App\Models\WalletLedger;
use App\Services\PaymentService;
use App\Services\SettlementService;
use App\Support\PlatformHealth;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

/**
 * The reconciliation check that sits at the top of the admin dashboard.
 *
 * The point of these tests is not that the check reports "balanced" on a clean
 * database - a method that returned true unconditionally would pass that. Each
 * test below breaks one specific invariant and demands the check notices. A
 * health indicator that cannot be made to go red tells an operator nothing.
 */
class PlatformHealthTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    private function health(): PlatformHealth
    {
        return app(PlatformHealth::class);
    }

    /** @return array<string, int> */
    private function anomalyCounts(): array
    {
        return collect($this->health()->anomalies())
            ->mapWithKeys(fn (array $row) => [$row['key'] => $row['count']])
            ->all();
    }

    private function payOneParticipant(): Payment
    {
        $patungan = $this->makePatungan($this->organizer(), ['Sandi']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        app(PaymentService::class)->markAsPaid($payment, 'TXN-HEALTH-'.$payment->id);

        return $payment->refresh();
    }

    public function test_an_untouched_platform_balances(): void
    {
        $this->assertTrue($this->health()->ledgerIntegrity()['balanced']);
    }

    public function test_a_real_payment_leaves_the_books_balanced(): void
    {
        $this->payOneParticipant();

        $integrity = $this->health()->ledgerIntegrity();

        $this->assertTrue($integrity['balanced'], 'A normal payment should not disturb the ledger.');
        $this->assertSame(0, $integrity['drift']);
    }

    public function test_a_payout_request_leaves_the_books_balanced(): void
    {
        /*
         * Worth its own test because the debit happens when the payout is
         * *requested*, not when it completes. An integrity check written around
         * completed payouts would report a false alarm for every payout still
         * in flight - which is most of them, most of the time.
         */
        $payment = $this->payOneParticipant();
        $organizer = $payment->organizer;

        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);
        app(SettlementService::class)->request($organizer, $destination, (int) config('patungan.payout.min_amount'));

        $integrity = $this->health()->ledgerIntegrity();

        $this->assertTrue($integrity['balanced'], 'A pending payout is already debited and must be accounted for.');
        $this->assertSame(SettlementStatus::Pending->value, Settlement::query()->sole()->status->value);
    }

    public function test_a_missing_credit_is_reported_as_drift(): void
    {
        $payment = $this->payOneParticipant();

        // The failure this check exists for: the payer was charged and the
        // credit never landed.
        WalletLedger::query()->where('payment_id', $payment->id)->delete();

        $integrity = $this->health()->ledgerIntegrity();

        $this->assertFalse($integrity['balanced']);
        $this->assertSame(-$payment->net_amount, $integrity['drift']);
        $this->assertSame(1, $this->anomalyCounts()['paid_without_ledger']);
    }

    public function test_a_duplicated_credit_is_reported_as_drift(): void
    {
        $payment = $this->payOneParticipant();

        $credit = WalletLedger::query()->where('payment_id', $payment->id)->firstOrFail();
        $copy = $credit->replicate();
        $copy->uuid = (string) Str::uuid();
        $copy->reference = $credit->reference.'-DUP';
        $copy->save();

        $integrity = $this->health()->ledgerIntegrity();

        $this->assertFalse($integrity['balanced'], 'Crediting the same payment twice must be visible.');
        $this->assertSame($payment->charged_amount, $integrity['drift']);
    }

    public function test_a_participant_charged_twice_is_flagged_as_critical(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Sandi']);
        $participant = $patungan->participants->first();

        $first = app(PaymentService::class)->createForParticipant($participant);
        app(PaymentService::class)->markAsPaid($first, 'TXN-DOUBLE-1');

        $this->assertSame(0, $this->anomalyCounts()['participant_paid_twice']);

        /*
         * What a stale QR produces: the invoice expired here, a replacement was
         * issued, and the old QR was paid anyway because DANA refuses
         * validityPeriod and the QR outlived our invoice. Both payments are
         * real money and both are credited - so it has to be visible and
         * refundable rather than quietly correct-looking.
         */
        $second = $first->replicate();
        $second->forceFill([
            'uuid' => (string) Str::uuid(),
            'gateway_reference' => $first->gateway_reference.'-STALE',
            // A separate charge really did happen, so it carries its own id.
            'gateway_transaction_id' => 'TXN-DOUBLE-2',
            'status' => PaymentStatus::Paid->value,
            'active_participant_id' => null,
        ])->save();

        $this->assertSame(1, $this->anomalyCounts()['participant_paid_twice']);
    }

    public function test_a_participant_marked_paid_without_a_payment_is_flagged(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Sandi']);
        $patungan->participants->first()->forceFill(['status' => ParticipantStatus::Paid->value])->save();

        $this->assertSame(1, $this->anomalyCounts()['participant_paid_no_payment']);
    }

    public function test_an_expired_pending_payment_is_flagged(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Sandi']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        $this->assertSame(0, $this->anomalyCounts()['stuck_pending'], 'A live invoice is not stuck.');

        $payment->forceFill(['expires_at' => now()->subHour()])->save();

        $this->assertSame(1, $this->anomalyCounts()['stuck_pending']);
    }

    public function test_a_payout_stuck_past_a_day_is_flagged(): void
    {
        $payment = $this->payOneParticipant();
        $destination = PayoutDestination::factory()->create(['user_id' => $payment->organizer_id]);

        $settlement = app(SettlementService::class)->request(
            $payment->organizer,
            $destination,
            (int) config('patungan.payout.min_amount'),
        );

        $this->assertSame(0, $this->anomalyCounts()['stuck_settlement'], 'A fresh payout is not stuck.');

        /*
         * requested_at, not updated_at: an admin opening the row and saving it
         * must not reset the clock on a payout that has been held for days.
         */
        $settlement->forceFill(['requested_at' => now()->subDays(2)])->save();

        $this->assertSame(1, $this->anomalyCounts()['stuck_settlement']);
    }
}
