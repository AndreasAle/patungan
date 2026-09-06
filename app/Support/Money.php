<?php

namespace App\Support;

/**
 * Rupiah helpers. Every amount in the system is an integer number of rupiah -
 * floats are never used for money.
 */
final class Money
{
    public static function format(int $amount): string
    {
        return 'Rp'.number_format($amount, 0, ',', '.');
    }

    /** Percentage in basis points, rounded half up to whole rupiah. */
    public static function basisPoints(int $amount, int $bps): int
    {
        return intdiv($amount * $bps + 5000, 10000);
    }
}
