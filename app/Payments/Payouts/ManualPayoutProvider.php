<?php

namespace App\Payments\Payouts;

use App\Contracts\PayoutProvider;
use App\Enums\SettlementStatus;
use App\Models\Settlement;
use App\Payments\PayoutResult;

/**
 * Admin-assisted payouts.
 *
 * No disbursement API is wired up, so a request is only queued: an operator
 * transfers the money and marks the settlement processed in the admin panel.
 * Swapping in an automated provider (Midtrans Iris, Xendit, Flip) means adding
 * a sibling class here - nothing else in the app needs to change.
 */
class ManualPayoutProvider implements PayoutProvider
{
    public function name(): string
    {
        return 'manual';
    }

    public function isAutomated(): bool
    {
        return false;
    }

    public function createPayout(Settlement $settlement): PayoutResult
    {
        return new PayoutResult(
            reference: 'MANUAL-'.$settlement->uuid,
            status: SettlementStatus::Pending,
            raw: ['queued_for_operator' => true],
        );
    }

    public function getPayoutStatus(Settlement $settlement): PayoutResult
    {
        // The operator's action in the admin panel is the only source of truth.
        return new PayoutResult(
            reference: (string) $settlement->provider_reference,
            status: $settlement->status,
        );
    }

    public function handleWebhook(array $payload, string $rawBody): ?PayoutResult
    {
        return null;
    }
}
