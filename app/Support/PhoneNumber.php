<?php

namespace App\Support;

/**
 * Indonesian mobile numbers, written the six ways people actually write them.
 *
 * 0812..., 62812..., +62 812-3456-7890 and "0812 3456 7890" are all the same
 * person. Storing them as typed means the same number verified twice looks like
 * two numbers, and an alert sent to the stored form reaches nobody when the
 * form is wrong. Everything is normalised to +628... on the way in.
 */
final class PhoneNumber
{
    /**
     * Returns the number in +62 form, or null when it is not a plausible
     * Indonesian mobile number.
     *
     * Deliberately strict about the leading 8: Indonesian mobiles all start
     * with it, and accepting a landline here would mean an OTP that silently
     * never arrives.
     */
    public static function normalise(?string $input): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $input) ?? '';

        if ($digits === '') {
            return null;
        }

        $national = match (true) {
            str_starts_with($digits, '62') => substr($digits, 2),
            str_starts_with($digits, '0') => substr($digits, 1),
            default => $digits,
        };

        if (! str_starts_with($national, '8')) {
            return null;
        }

        // Indonesian mobile subscriber numbers run 9 to 12 digits after the 8.
        $length = strlen($national);

        if ($length < 9 || $length > 13) {
            return null;
        }

        return '+62'.$national;
    }

    /** "+6281234567890" becomes "+62 812-3456-7890" for display. */
    public static function pretty(?string $normalised): ?string
    {
        if ($normalised === null || ! str_starts_with($normalised, '+62')) {
            return $normalised;
        }

        $national = substr($normalised, 3);
        $parts = array_filter([
            substr($national, 0, 3),
            substr($national, 3, 4),
            substr($national, 7),
        ], static fn (string $part): bool => $part !== '');

        return '+62 '.implode('-', $parts);
    }

    /** Last four digits only, for saying which number without printing it. */
    public static function masked(?string $normalised): ?string
    {
        if ($normalised === null) {
            return null;
        }

        return str_repeat('*', 6).substr($normalised, -4);
    }
}
