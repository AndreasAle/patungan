<?php

namespace App\Contracts;

use App\Models\Settlement;
use App\Payments\PayoutResult;

interface PayoutProvider
{
    public function name(): string;

    /**
     * Whether the provider actually moves money by API. When false the platform
     * must not pretend a payout is automated - it is queued for an operator.
     */
    public function isAutomated(): bool;

    public function createPayout(Settlement $settlement): PayoutResult;

    public function getPayoutStatus(Settlement $settlement): PayoutResult;

    /**
     * Normalises a payout webhook into a result, or returns null when the
     * payload is not a payout notification.
     *
     * @param  array<string, mixed>  $payload
     */
    public function handleWebhook(array $payload, string $rawBody): ?PayoutResult;
}
