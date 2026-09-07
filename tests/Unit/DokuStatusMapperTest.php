<?php

namespace Tests\Unit;

use App\Enums\PaymentStatus;
use App\Payments\Doku\DokuStatusMapper;
use PHPUnit\Framework\TestCase;

class DokuStatusMapperTest extends TestCase
{
    public function test_documented_transaction_statuses_map_to_our_own(): void
    {
        $this->assertSame(PaymentStatus::Paid, DokuStatusMapper::fromTransactionStatus('00'));
        $this->assertSame(PaymentStatus::Pending, DokuStatusMapper::fromTransactionStatus('03'));
        $this->assertSame(PaymentStatus::Refunded, DokuStatusMapper::fromTransactionStatus('04'));
        $this->assertSame(PaymentStatus::Cancelled, DokuStatusMapper::fromTransactionStatus('05'));
        $this->assertSame(PaymentStatus::Failed, DokuStatusMapper::fromTransactionStatus('06'));
    }

    public function test_an_unknown_status_stays_pending_rather_than_guessing(): void
    {
        // Guessing PAID would credit money that may never have moved; guessing
        // FAILED would strand someone who has already paid.
        $this->assertSame(PaymentStatus::Pending, DokuStatusMapper::fromTransactionStatus('99'));
        $this->assertSame(PaymentStatus::Pending, DokuStatusMapper::fromTransactionStatus(null));
        $this->assertSame(PaymentStatus::Pending, DokuStatusMapper::fromTransactionStatus(''));
    }

    public function test_only_two_hundred_series_response_codes_count_as_success(): void
    {
        $this->assertTrue(DokuStatusMapper::isSuccessResponse('2004700'));
        $this->assertTrue(DokuStatusMapper::isSuccessResponse('2005100'));
        $this->assertFalse(DokuStatusMapper::isSuccessResponse('4004701'));
        $this->assertFalse(DokuStatusMapper::isSuccessResponse('5000000'));
        $this->assertFalse(DokuStatusMapper::isSuccessResponse(null));
    }

    public function test_amounts_convert_between_rupiah_and_the_two_decimal_form(): void
    {
        $this->assertSame('25500.00', DokuStatusMapper::rupiahToAmount(25500));
        $this->assertSame('1000000.00', DokuStatusMapper::rupiahToAmount(1000000));

        $this->assertSame(25500, DokuStatusMapper::amountToRupiah('25500.00'));
        $this->assertSame(25500, DokuStatusMapper::amountToRupiah('25500'));
        $this->assertSame(25500, DokuStatusMapper::amountToRupiah(25500));
    }

    public function test_a_malformed_amount_is_refused_rather_than_coerced(): void
    {
        // "abc" coerced to 0 would compare equal to nothing and silently pass a
        // mismatch check, so it has to come back as null instead.
        $this->assertNull(DokuStatusMapper::amountToRupiah('abc'));
        $this->assertNull(DokuStatusMapper::amountToRupiah(null));
        $this->assertNull(DokuStatusMapper::amountToRupiah('25.500,00'));
        $this->assertNull(DokuStatusMapper::amountToRupiah([]));
    }

    public function test_a_round_trip_keeps_the_rupiah_exact(): void
    {
        foreach ([1000, 25000, 25500, 999999, 10000000] as $rupiah) {
            $this->assertSame($rupiah, DokuStatusMapper::amountToRupiah(DokuStatusMapper::rupiahToAmount($rupiah)));
        }
    }
}
