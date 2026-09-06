<?php

namespace App\Support;

final readonly class FeeBreakdown
{
    public function __construct(
        /** What the participant owes the patungan. */
        public int $amount,
        /** Added on top of the bill when the payer carries the fees. */
        public int $serviceFee,
        /** What the payer is actually charged: amount + serviceFee. */
        public int $chargedAmount,
        public int $gatewayFee,
        public int $platformFee,
        /** gatewayFee + platformFee. */
        public int $totalFee,
        /** What lands in the organizer balance: chargedAmount - totalFee. */
        public int $netAmount,
    ) {}

    /** @return array<string, int> */
    public function toArray(): array
    {
        return [
            'amount' => $this->amount,
            'service_fee' => $this->serviceFee,
            'charged_amount' => $this->chargedAmount,
            'gateway_fee' => $this->gatewayFee,
            'platform_fee' => $this->platformFee,
            'fee' => $this->totalFee,
            'net_amount' => $this->netAmount,
        ];
    }
}
