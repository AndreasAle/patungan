<?php

namespace App\Services;

use App\Contracts\PayoutProvider;
use App\Enums\SettlementStatus;
use App\Events\PayoutCompleted;
use App\Events\PayoutRequested;
use App\Models\PayoutDestination;
use App\Models\Settlement;
use App\Models\User;
use App\Payouts\PayoutRiskPolicy;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class SettlementService
{
    public function __construct(
        private readonly PayoutProvider $provider,
        private readonly LedgerService $ledger,
        private readonly Analytics $analytics,
        private readonly PayoutRiskPolicy $risk,
    ) {}

    /**
     * Requests a payout. The debit is written to the ledger inside the same
     * transaction that creates the settlement, so a balance can never be
     * withdrawn twice by concurrent requests.
     */
    public function request(User $organizer, PayoutDestination $destination, int $amount): Settlement
    {
        if ($destination->user_id !== $organizer->id) {
            throw ValidationException::withMessages([
                'payout_destination_id' => 'Rekening tujuan tidak valid.',
            ]);
        }

        $minimum = (int) config('patungan.payout.min_amount');

        if ($amount < $minimum) {
            throw ValidationException::withMessages([
                'amount' => 'Minimal pencairan '.Money::format($minimum).'.',
            ]);
        }

        /*
         * Decided before the money moves, and recorded alongside it. An
         * automated provider is necessary but not sufficient: the policy still
         * has to agree, and where it does not the payout is queued for an
         * operator rather than refused. The money is the organizer's; our
         * caution should cost them time, not access.
         */
        $decision = $this->risk->evaluate($organizer, $destination, $amount);
        $automatic = $decision['automatic'] && $this->provider->isAutomated();

        $settlement = DB::transaction(function () use ($organizer, $destination, $amount, $automatic, $decision): Settlement {
            // Serialise concurrent payout requests for this organizer.
            User::query()->lockForUpdate()->find($organizer->id);

            $available = $this->ledger->availableBalance($organizer);

            if ($amount > $available) {
                throw ValidationException::withMessages([
                    'amount' => 'Saldo tersedia tidak cukup.',
                ]);
            }

            $settlement = new Settlement;
            $settlement->forceFill([
                'uuid' => (string) Str::uuid(),
                'organizer_id' => $organizer->id,
                'payout_destination_id' => $destination->id,
                'destination_type' => $destination->type->value,
                'destination_account_reference' => $destination->maskedLabel(),
                'destination_holder_name' => $destination->account_holder,
                'amount' => $amount,
                'fee' => 0,
                'net_amount' => $amount,
                'currency' => config('patungan.currency'),
                'provider' => $this->provider->name(),
                'status' => SettlementStatus::Pending->value,
                'requested_at' => now(),
                'metadata' => [
                    'automated' => $automatic,
                    /*
                     * Why it is waiting, kept on the row rather than recomputed
                     * later. The reasons are true as of this moment - the
                     * destination ages, the phone gets verified - and an
                     * operator reading this next week needs what was true when
                     * the request was made, not what is true now.
                     */
                    'review_reasons' => $decision['reasons'],
                ],
            ])->save();

            $this->ledger->recordPayout($settlement);

            return $settlement;
        });

        if ($automatic) {
            $result = $this->provider->createPayout($settlement);
            $settlement->forceFill([
                'provider_reference' => $result->reference,
                'status' => $result->status->value,
            ])->save();
        }

        PayoutRequested::dispatch($settlement);
        $this->analytics->record(
            Analytics::PAYOUT_REQUESTED,
            ['amount' => $amount, 'provider' => $this->provider->name()],
            userId: $organizer->id,
        );

        return $settlement;
    }

    public function markProcessing(Settlement $settlement, User $actor): Settlement
    {
        $settlement->forceFill([
            'status' => SettlementStatus::Processing->value,
            'processed_by_user_id' => $actor->id,
        ])->save();

        return $settlement;
    }

    public function markCompleted(Settlement $settlement, User $actor, ?string $providerReference = null): Settlement
    {
        DB::transaction(function () use ($settlement, $actor, $providerReference): void {
            $locked = Settlement::query()->lockForUpdate()->findOrFail($settlement->id);

            if ($locked->status === SettlementStatus::Completed) {
                return;
            }

            $locked->forceFill([
                'status' => SettlementStatus::Completed->value,
                'processed_at' => now(),
                'processed_by_user_id' => $actor->id,
                'provider_reference' => $providerReference ?: $locked->provider_reference,
            ])->save();

            $settlement->setRawAttributes($locked->getAttributes(), true);

            DB::afterCommit(fn () => PayoutCompleted::dispatch($locked));
        });

        $this->analytics->record(
            Analytics::PAYOUT_COMPLETED,
            ['amount' => $settlement->amount],
            userId: $settlement->organizer_id,
        );

        return $settlement->refresh();
    }

    /** Fails or rejects a payout and returns the held funds to the organizer. */
    public function markFailed(Settlement $settlement, User $actor, SettlementStatus $status, string $reason): Settlement
    {
        DB::transaction(function () use ($settlement, $actor, $status, $reason): void {
            $locked = Settlement::query()->lockForUpdate()->findOrFail($settlement->id);

            if (in_array($locked->status, [SettlementStatus::Failed, SettlementStatus::Rejected, SettlementStatus::Completed], true)) {
                return;
            }

            $locked->forceFill([
                'status' => $status->value,
                'failed_at' => now(),
                'failure_reason' => $reason,
                'processed_by_user_id' => $actor->id,
            ])->save();

            $this->ledger->reversePayout($locked, $reason);

            $settlement->setRawAttributes($locked->getAttributes(), true);
        });

        return $settlement->refresh();
    }

    public function providerIsAutomated(): bool
    {
        return $this->provider->isAutomated();
    }

    public function providerName(): string
    {
        return $this->provider->name();
    }
}
