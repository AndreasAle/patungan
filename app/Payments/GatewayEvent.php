<?php

namespace App\Payments;

use App\Enums\PaymentStatus;

/**
 * A normalised payment notification, whether it arrived by webhook or was
 * pulled from the provider during reconciliation.
 */
final readonly class GatewayEvent
{
    /** @param  array<string, mixed>  $raw */
    public function __construct(
        public string $reference,
        public ?string $transactionId,
        public PaymentStatus $status,
        public int $grossAmount,
        public bool $signatureValid,
        public string $eventType,
        public array $raw,
    ) {}
}
