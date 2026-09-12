<?php

namespace App\Payments;

use App\Enums\PaymentStatus;
use Carbon\CarbonImmutable;

final readonly class ChargeResult
{
    /** @param  array<string, mixed>  $raw */
    public function __construct(
        /*
         * The provider's own id for the charge, when it issues one at creation.
         * DANA's QRIS generate does not: it returns only the QR. Matching and
         * reconciliation run on our own reference, so this stays empty until a
         * notification supplies it.
         */
        public ?string $transactionId,
        public PaymentStatus $status,
        public ?string $qrString,
        public ?string $qrUrl,
        public CarbonImmutable $expiresAt,
        public array $raw,
        /** The provider's own id for the call that opened this charge, when it has one. */
        public ?string $externalId = null,
    ) {}
}
