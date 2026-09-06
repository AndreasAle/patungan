<?php

namespace App\Payments;

/**
 * Everything a gateway needs to open a QRIS charge. All amounts are integer
 * rupiah resolved on the server from the database - never from client input.
 */
final readonly class ChargeRequest
{
    public function __construct(
        public string $reference,
        public int $amount,
        public string $description,
        public string $participantName,
        public string $patunganTitle,
        public int $expirySeconds,
    ) {}
}
