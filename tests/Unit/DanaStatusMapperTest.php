<?php

namespace Tests\Unit;

use App\Enums\PaymentStatus;
use App\Payments\Dana\DanaStatusMapper;
use PHPUnit\Framework\TestCase;

class DanaStatusMapperTest extends TestCase
{
    public function test_only_a_final_success_settles_a_payment(): void
    {
        $this->assertSame(PaymentStatus::Paid, DanaStatusMapper::fromTransactionStatus('00'));
    }

    public function test_a_closed_order_is_cancelled(): void
    {
        $this->assertSame(PaymentStatus::Cancelled, DanaStatusMapper::fromTransactionStatus('05'));
    }

    public function test_non_final_and_unknown_statuses_stay_pending(): void
    {
        /*
         * 02 is the one worth spelling out. DANA's wording is "payment is
         * success", but it is explicitly not a final state, and crediting an
         * organizer from it would hand out money that can still be reversed.
         *
         * 07 "not found" usually means the query raced ahead of DANA's own
         * write; marking it failed would strand somebody mid-payment.
         */
        foreach (['01', '02', '07', '99', '', null] as $status) {
            $this->assertSame(
                PaymentStatus::Pending,
                DanaStatusMapper::fromTransactionStatus($status),
                var_export($status, true),
            );
        }
    }

    public function test_it_recognises_success_response_codes(): void
    {
        // HTTP status + service code + case code.
        $this->assertTrue(DanaStatusMapper::isSuccessResponse('2004700'));
        $this->assertTrue(DanaStatusMapper::isSuccessResponse('2005500'));
        $this->assertTrue(DanaStatusMapper::isSuccessResponse('2005600'));

        $this->assertFalse(DanaStatusMapper::isSuccessResponse('4004701'));
        $this->assertFalse(DanaStatusMapper::isSuccessResponse('5005601'));
        $this->assertFalse(DanaStatusMapper::isSuccessResponse(null));
    }

    public function test_it_distinguishes_retryable_failures_from_refusals(): void
    {
        // Retrying a refusal never helps; retrying a 5xx often does.
        $this->assertTrue(DanaStatusMapper::isRetryableResponse('5005601'));
        $this->assertTrue(DanaStatusMapper::isRetryableResponse('2025600'));
        $this->assertFalse(DanaStatusMapper::isRetryableResponse('4004701'));
        $this->assertFalse(DanaStatusMapper::isRetryableResponse('2004700'));
    }

    public function test_amounts_convert_both_ways_without_drift(): void
    {
        $this->assertSame('25428.00', DanaStatusMapper::rupiahToAmount(25428));
        $this->assertSame(25428, DanaStatusMapper::amountToRupiah('25428.00'));
        $this->assertSame(0, DanaStatusMapper::amountToRupiah('0.00'));

        foreach ([1, 999, 25_000, 16_500_000, 999_999_999] as $rupiah) {
            $this->assertSame($rupiah, DanaStatusMapper::amountToRupiah(DanaStatusMapper::rupiahToAmount($rupiah)));
        }
    }

    public function test_an_unreadable_amount_is_null_and_never_zero(): void
    {
        /*
         * Zero is a real amount. Treating a malformed field as zero would let a
         * payment settle for nothing while looking perfectly ordinary in the
         * ledger, so every one of these has to come back null.
         */
        foreach (['', 'abc', '10,000.00', '-500.00', '1e5', null, [], '10000.000'] as $value) {
            $this->assertNull(DanaStatusMapper::amountToRupiah($value), var_export($value, true));
        }
    }
}
