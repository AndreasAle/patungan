<?php

namespace App\Services;

use App\Support\FeeBreakdown;
use App\Support\Money;
use Illuminate\Contracts\Config\Repository as Config;

/**
 * Turns a participant's bill into a fee breakdown. Rates come from config, never
 * from hardcoded numbers, and all arithmetic stays in integer rupiah.
 */
class FeeCalculator
{
    public function __construct(private readonly Config $config) {}

    public function for(int $amount): FeeBreakdown
    {
        $gatewayFee = $this->component('gateway', $amount);
        $platformFee = $this->component('platform', $amount);
        $totalFee = $gatewayFee + $platformFee;

        $payerPays = $this->bearer() === 'payer';
        $serviceFee = $payerPays ? $totalFee : 0;
        $chargedAmount = $amount + $serviceFee;

        return new FeeBreakdown(
            amount: $amount,
            serviceFee: $serviceFee,
            chargedAmount: $chargedAmount,
            gatewayFee: $gatewayFee,
            platformFee: $platformFee,
            totalFee: $totalFee,
            netAmount: $chargedAmount - $totalFee,
        );
    }

    public function bearer(): string
    {
        return $this->config->get('patungan.fees.bearer') === 'payer' ? 'payer' : 'organizer';
    }

    private function component(string $key, int $amount): int
    {
        $flat = (int) $this->config->get("patungan.fees.{$key}.flat", 0);
        $bps = (int) $this->config->get("patungan.fees.{$key}.bps", 0);

        return max(0, $flat + Money::basisPoints($amount, $bps));
    }
}
