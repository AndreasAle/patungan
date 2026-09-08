<?php

namespace Tests\Unit;

use App\Services\FeeCalculator;
use Illuminate\Config\Repository;
use PHPUnit\Framework\TestCase;

class FeeCalculatorTest extends TestCase
{
    private function calculator(string $bearer): FeeCalculator
    {
        return new FeeCalculator(new Repository([
            'patungan' => [
                'fees' => [
                    'bearer' => $bearer,
                    'platform' => ['flat' => 250, 'bps' => 0],
                    'gateway' => ['flat' => 0, 'bps' => 70],
                ],
            ],
        ]));
    }

    public function test_the_organizer_absorbs_the_fees_by_default(): void
    {
        $breakdown = $this->calculator('organizer')->for(25000);

        $this->assertSame(25000, $breakdown->amount);
        $this->assertSame(0, $breakdown->serviceFee);
        $this->assertSame(25000, $breakdown->chargedAmount);
        $this->assertSame(175, $breakdown->gatewayFee);
        $this->assertSame(250, $breakdown->platformFee);
        $this->assertSame(24575, $breakdown->netAmount);
    }

    public function test_the_payer_can_carry_the_fees_instead(): void
    {
        $breakdown = $this->calculator('payer')->for(25000);

        $this->assertSame(25000, $breakdown->amount);

        /*
         * 428, not 425. Adding the bill's own fees on top would charge 25.425,
         * but the gateway then takes 0.70% of 25.425 rather than of 25.000 - so
         * the organizer would land on 24.997 while the ledger claimed 25.000.
         * The charge is solved for instead, which costs three more rupiah and
         * makes the promise true.
         */
        $this->assertSame(428, $breakdown->serviceFee);
        $this->assertSame(25428, $breakdown->chargedAmount);
        $this->assertSame(178, $breakdown->gatewayFee);
        $this->assertSame(250, $breakdown->platformFee);

        // The organizer receives the full bill.
        $this->assertSame(25000, $breakdown->netAmount);
    }

    public function test_every_component_stays_an_integer(): void
    {
        $breakdown = $this->calculator('organizer')->for(33333);

        $this->assertIsInt($breakdown->gatewayFee);
        $this->assertIsInt($breakdown->netAmount);
        // 0.70% of 33.333 = 233,331 -> rounded half up to 233.
        $this->assertSame(233, $breakdown->gatewayFee);
        $this->assertSame($breakdown->chargedAmount - $breakdown->totalFee, $breakdown->netAmount);
    }

    public function test_the_payer_is_charged_enough_that_the_organizer_nets_the_full_bill(): void
    {
        $breakdown = $this->calculator('payer')->for(25000);

        // The whole point of this mode: the bill arrives intact.
        $this->assertSame(25000, $breakdown->amount);
        $this->assertGreaterThanOrEqual(25000, $breakdown->netAmount);
        $this->assertSame($breakdown->chargedAmount - $breakdown->amount, $breakdown->serviceFee);
    }

    public function test_the_gateway_fee_is_taken_on_what_is_charged_not_on_the_bill(): void
    {
        $breakdown = $this->calculator('payer')->for(25000);

        // 0.70% of the charged amount, which is more than the bill. Charging the
        // bill's percentage would leave the organizer a few rupiah short.
        $expected = intdiv($breakdown->chargedAmount * 70 + 5000, 10000);

        $this->assertSame($expected, $breakdown->gatewayFee);
        $this->assertGreaterThan(intdiv(25000 * 70 + 5000, 10000), $breakdown->gatewayFee);
    }

    public function test_the_organizer_is_never_short_at_any_bill_size(): void
    {
        $calculator = $this->calculator('payer');

        foreach ([1000, 5000, 25000, 49999, 100000, 1234567, 10000000] as $amount) {
            $breakdown = $calculator->for($amount);

            $this->assertGreaterThanOrEqual(
                $amount,
                $breakdown->netAmount,
                "Organizer would receive less than {$amount}",
            );

            // And never overcharged into a windfall either.
            $this->assertLessThanOrEqual($amount + 2, $breakdown->netAmount);
        }
    }

    public function test_the_breakdown_always_balances(): void
    {
        foreach (['organizer', 'payer'] as $bearer) {
            foreach ([1000, 25000, 250000] as $amount) {
                $b = $this->calculator($bearer)->for($amount);

                $this->assertSame($b->amount + $b->serviceFee, $b->chargedAmount);
                $this->assertSame($b->gatewayFee + $b->platformFee, $b->totalFee);
                $this->assertSame($b->chargedAmount - $b->totalFee, $b->netAmount);
            }
        }
    }

    public function test_a_nonsensical_gateway_rate_does_not_diverge(): void
    {
        $calculator = new FeeCalculator(new Repository([
            'patungan' => ['fees' => [
                'bearer' => 'payer',
                'platform' => ['flat' => 250, 'bps' => 0],
                // A rate of 100% cannot be grossed up; it must not loop or explode.
                'gateway' => ['flat' => 0, 'bps' => 10000],
            ]],
        ]));

        $breakdown = $calculator->for(25000);

        $this->assertSame(25250, $breakdown->chargedAmount);
    }
}
