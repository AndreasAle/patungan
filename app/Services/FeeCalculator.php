<?php

namespace App\Services;

use App\Support\FeeBreakdown;
use App\Support\Money;
use Illuminate\Contracts\Config\Repository as Config;

/**
 * Turns a participant's bill into a fee breakdown. Rates come from config, never
 * from hardcoded numbers, and all arithmetic stays in integer rupiah.
 *
 * Who carries the fees changes the arithmetic, not just the presentation:
 *
 *  - organizer: the participant pays the bill, and the fees come out of it.
 *  - payer:     the participant pays the bill plus enough that the organizer
 *               still nets the full bill.
 *
 * The second case cannot simply add the fees on top. The gateway takes its
 * percentage of what it actually charges, so adding a fee raises the fee. The
 * charged amount is solved for instead - see grossUp().
 */
class FeeCalculator
{
    public function __construct(private readonly Config $config) {}

    public function for(int $amount): FeeBreakdown
    {
        // Our own fee is quoted against the bill, so it stays predictable for
        // the organizer regardless of who ends up carrying it.
        $platformFee = $this->component('platform', $amount);

        $payerCarries = $this->bearer() === 'payer';

        $chargedAmount = $payerCarries
            ? $this->grossUp($amount, $platformFee)
            : $amount;

        /*
         * Computed from what is charged, not from the bill. With the payer
         * carrying fees these differ, and using the bill would under-collect -
         * the ledger would credit the organizer more than actually arrived.
         */
        $gatewayFee = $this->component('gateway', $chargedAmount);

        if ($payerCarries) {
            /*
             * Rounding the charge up leaves a rupiah or two spare. Our own fee
             * absorbs it rather than handing the organizer an odd surplus, so a
             * Rp50.000 bill settles at exactly Rp50.000 instead of Rp50.001.
             * This only ever moves the platform fee up, never below its rate.
             */
            $platformFee = $chargedAmount - $gatewayFee - $amount;
        }

        $totalFee = $gatewayFee + $platformFee;

        return new FeeBreakdown(
            amount: $amount,
            serviceFee: $chargedAmount - $amount,
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

    /**
     * The smallest charge that still leaves the organizer the full bill.
     *
     * Solving charged - gatewayFlat - charged*bps - platformFee >= amount for
     * charged gives (amount + gatewayFlat + platformFee) / (1 - bps), rounded
     * up so the organizer is never a rupiah short.
     */
    private function grossUp(int $amount, int $platformFee): int
    {
        $flat = (int) $this->config->get('patungan.fees.gateway.flat', 0);
        $bps = (int) $this->config->get('patungan.fees.gateway.bps', 0);

        $target = $amount + $platformFee + $flat;
        $divisor = 10000 - $bps;

        if ($divisor <= 0) {
            // A gateway rate of 100% or more is a misconfiguration, not a price;
            // grossing up would diverge, so the fees simply sit on top.
            return $amount + $platformFee + $flat;
        }

        // Integer ceiling, so no float ever touches a rupiah.
        return intdiv($target * 10000 + $divisor - 1, $divisor);
    }

    private function component(string $key, int $amount): int
    {
        $flat = (int) $this->config->get("patungan.fees.{$key}.flat", 0);
        $bps = (int) $this->config->get("patungan.fees.{$key}.bps", 0);

        return max(0, $flat + Money::basisPoints($amount, $bps));
    }
}
