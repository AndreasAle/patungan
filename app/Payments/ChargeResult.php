<?php

namespace App\Payments;

use App\Enums\PaymentStatus;
use Carbon\CarbonImmutable;

final readonly class ChargeResult
{
    /** @param  array<string, mixed>  $raw */
    public function __construct(
        public string $transactionId,
        public PaymentStatus $status,
        public ?string $qrString,
        public ?string $qrUrl,
        public CarbonImmutable $expiresAt,
        public array $raw,
        /** The provider's own id for the call that opened this charge, when it has one. */
        public ?string $externalId = null,
    ) {}
}
