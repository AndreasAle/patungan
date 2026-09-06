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
        $this->assertSame(425, $breakdown->serviceFee);
        $this->assertSame(25425, $breakdown->chargedAmount);
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
}
