<?php

namespace App\Payments\Doku;

use Illuminate\Support\Str;

/**
 * Builds the X-EXTERNAL-ID that must be unique per request on DOKU's side.
 *
 * DOKU requires a numeric string, so this is microsecond time (16 digits) plus
 * ten cryptographically random digits. Two requests in the same microsecond
 * would still need to draw the same ten digits to collide, which is a one in
 * ten billion chance within that microsecond.
 *
 * The value is stored on the payment so a request in DOKU's logs can always be
 * traced back to one of ours.
 */
final class DokuExternalIdGenerator
{
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
            && Str::of($value)->test('/^\d+$/');
    }
}
