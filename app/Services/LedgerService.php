<?php

namespace App\Services;

use App\Enums\LedgerDirection;
use App\Enums\LedgerType;
use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Models\Settlement;
use App\Models\User;
use App\Models\WalletLedger;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The ledger is the only place organizer money is recorded. Balances are always
 * derived from it - no counter column is ever trusted as financial truth.
 */
class LedgerService
{
    /**
     * Records the money movement for a payment that has just been marked PAID.
     * Safe to call twice: the (type, reference) unique index makes each entry
     * idempotent, so a replayed webhook cannot double credit anyone.
     */
    public function recordPaymentReceived(Payment $payment): void
    {
        $this->write(
            $payment->organizer_id,
            LedgerType::PaymentReceived,
            LedgerDirection::Credit,
            $payment->charged_amount,
            $payment->uuid,
            'Dana masuk dari '.$payment->participant->name,
            $payment,
        );

        if ($payment->gateway_fee > 0) {
            $this->write(
                $payment->organizer_id,
                LedgerType::PaymentGatewayFee,
                LedgerDirection::Debit,
                $payment->gateway_fee,
                $payment->uuid,
                'Biaya payment gateway',
                $payment,
            );
        }

        if ($payment->platform_fee > 0) {
            $this->write(
                $payment->organizer_id,
                LedgerType::PlatformFee,
                LedgerDirection::Debit,
                $payment->platform_fee,
                $payment->uuid,
                'Biaya layanan Patungan',
                $payment,
            );
        }
    }

    public function recordPayout(Settlement $settlement): void
    {
        $this->writeSettlementEntry(
            $settlement,
            LedgerType::Payout,
            LedgerDirection::Debit,
            $settlement->amount,
            'Pencairan ke '.$settlement->destination_account_reference,
        );
    }

    /** Returns the funds to the organizer when a payout fails or is rejected. */
    public function reversePayout(Settlement $settlement, string $reason): void
    {
        $this->writeSettlementEntry(
            $settlement,
            LedgerType::PayoutReversal,
            LedgerDirection::Credit,
            $settlement->amount,
            'Pencairan dikembalikan: '.$reason,
        );
    }

    /** Authoritative available balance, derived from the ledger. */
    public function availableBalance(User|int $user): int
    {
        $userId = $user instanceof User ? $user->id : $user;

        $sums = WalletLedger::query()
            ->where('user_id', $userId)
            ->selectRaw('direction, COALESCE(SUM(amount), 0) as total')
            ->groupBy('direction')
            ->pluck('total', 'direction');

        $credit = (int) ($sums[LedgerDirection::Credit->value] ?? 0);
        $debit = (int) ($sums[LedgerDirection::Debit->value] ?? 0);

        return $credit - $debit;
    }

    /** Money that has been charged but has not settled into the ledger yet. */
    public function pendingBalance(User|int $user): int
    {
        $userId = $user instanceof User ? $user->id : $user;

        return (int) Payment::query()
            ->where('organizer_id', $userId)
            ->where('status', PaymentStatus::Pending->value)
            ->sum('net_amount');
    }

    public function totalPaidOut(User|int $user): int
    {
        $userId = $user instanceof User ? $user->id : $user;

        $out = (int) WalletLedger::query()
            ->where('user_id', $userId)
            ->where('type', LedgerType::Payout->value)
            ->sum('amount');

        $reversed = (int) WalletLedger::query()
            ->where('user_id', $userId)
            ->where('type', LedgerType::PayoutReversal->value)
            ->sum('amount');

        return $out - $reversed;
    }

    private function writeSettlementEntry(
        Settlement $settlement,
        LedgerType $type,
        LedgerDirection $direction,
        int $amount,
        string $description,
    ): void {
        $entry = $this->buildEntry(
            $settlement->organizer_id,
            $type,
            $direction,
            $amount,
            $settlement->uuid,
            $description,
        );
        $entry['settlement_id'] = $settlement->id;

        $this->insert($entry);
    }

    private function write(
        int $userId,
        LedgerType $type,
        LedgerDirection $direction,
        int $amount,
        string $reference,
        string $description,
        Payment $payment,
    ): void {
        $entry = $this->buildEntry($userId, $type, $direction, $amount, $reference, $description);
        $entry['payment_id'] = $payment->id;
        $entry['patungan_id'] = $payment->patungan_id;

        $this->insert($entry);
    }

    /** @return array<string, mixed> */
    private function buildEntry(
        int $userId,
        LedgerType $type,
        LedgerDirection $direction,
        int $amount,
        string $reference,
        string $description,
    ): array {
        return [
            'uuid' => (string) Str::uuid(),
            'user_id' => $userId,
            'type' => $type->value,
            'direction' => $direction->value,
            'amount' => $amount,
            'reference' => $reference,
            'description' => $description,
            'currency' => config('patungan.currency'),
            'created_at' => now(),
            'updated_at' => now(),
        ];
    }

    /** @param  array<string, mixed>  $entry */
    private function insert(array $entry): void
    {
        $balanceBefore = $this->availableBalance($entry['user_id']);
        $sign = $entry['direction'] === LedgerDirection::Credit->value ? 1 : -1;
        $entry['balance_after'] = $balanceBefore + ($sign * $entry['amount']);

        try {
            DB::table('wallet_ledgers')->insert($entry);
        } catch (QueryException $e) {
            // Duplicate (type, reference): the entry already exists, which is the
            // whole point of the unique index. Anything else is a real failure.
            if (! $this->isDuplicateKey($e)) {
                throw $e;
            }
        }
    }

    private function isDuplicateKey(QueryException $e): bool
    {
        return in_array((string) $e->getCode(), ['23000', '23505'], true);
    }
}
