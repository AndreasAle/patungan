<?php

namespace App\Payments;

use App\Enums\SettlementStatus;

final readonly class PayoutResult
{
    /** @param  array<string, mixed>  $raw */
    public function __construct(
        public string $reference,
        public SettlementStatus $status,
        public ?string $failureReason = null,
        public array $raw = [],
    ) {}
}
