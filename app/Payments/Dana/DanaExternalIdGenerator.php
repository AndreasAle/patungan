<?php

namespace App\Payments\Dana;

/**
 * Builds the X-EXTERNAL-ID that DANA requires to be unique within a day.
 *
 * Microsecond time (16 digits) plus ten cryptographically random digits. Two
 * requests in the same microsecond would still have to draw the same ten digits
 * to collide, which is one chance in ten billion inside that microsecond.
 *
 * The value is stored on the payment, so any request in DANA's logs can be
 * traced back to one of ours without asking them to search by amount.
 */
final class DanaExternalIdGenerator
{
    /** DANA documents X-EXTERNAL-ID as 1-36 characters. */
    public const MAX_LENGTH = 32;

    public function generate(): string
    {
        $microseconds = (string) (int) (microtime(true) * 1_000_000);
        $random = '';

        for ($i = 0; $i < 10; $i++) {
            $random .= (string) random_int(0, 9);
        }

        return substr($microseconds.$random, 0, self::MAX_LENGTH);
    }

    public static function isValid(string $value): bool
    {
        return $value !== ''
            && strlen($value) <= self::MAX_LENGTH
            && preg_match('/^\d+$/', $value) === 1;
    }
}
