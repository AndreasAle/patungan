<?php

namespace App\Payments\Snap;

use Carbon\CarbonImmutable;
use InvalidArgumentException;

/**
 * The parts of Bank Indonesia's SNAP standard that every provider shares.
 *
 * DOKU and DANA both implement SNAP, so both minify the request body the same
 * way, hash it the same way, format timestamps the same way and write amounts
 * the same way. Keeping one implementation matters more here than in most
 * shared code: if two copies of the minifier ever drifted by a single space,
 * one provider's signatures would start failing in production and the cause
 * would be invisible from the error - the request looks correct, the signature
 * simply does not match.
 *
 * What is deliberately NOT here is the signing itself. DOKU signs transactions
 * with HMAC-SHA512 and DANA with RSA, and pretending those are one thing behind
 * a shared helper would hide the difference that actually matters.
 */
final class SnapJson
{
    /**
     * Strips whitespace that sits between JSON tokens, leaving whitespace
     * inside string literals untouched.
     *
     * Re-encoding a decoded payload is not equivalent: it can change escaping
     * and would produce a different hash from the bytes actually sent.
     */
    public static function minify(string $json): string
    {
        $out = '';
        $inString = false;
        $escaped = false;

        foreach (str_split($json) as $char) {
            if ($inString) {
                $out .= $char;

                if ($escaped) {
                    $escaped = false;
                } elseif ($char === '\\') {
                    $escaped = true;
                } elseif ($char === '"') {
                    $inString = false;
                }

                continue;
            }

            if ($char === '"') {
                $inString = true;
                $out .= $char;

                continue;
            }

            if ($char === ' ' || $char === "\n" || $char === "\r" || $char === "\t") {
                continue;
            }

            $out .= $char;
        }

        return $out;
    }

    /** lowercase(hex(sha256(minify(body)))), which is what SNAP signs over. */
    public static function hashBody(string $body): string
    {
        return strtolower(hash('sha256', self::minify($body)));
    }

    /**
     * Encodes a body exactly as it will be sent.
     *
     * The caller must transmit this same string: hashing one encoding and
     * sending another is the single easiest way to produce a signature that
     * cannot be verified.
     *
     * @param  array<string, mixed>  $body
     */
    public static function encode(array $body): string
    {
        $encoded = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if ($encoded === false) {
            throw new InvalidArgumentException('Request body could not be encoded as JSON.');
        }

        return $encoded;
    }

    /** ISO-8601 with a GMT+7 offset, e.g. 2026-09-10T14:18:39+07:00. */
    public static function timestamp(?\DateTimeInterface $at = null): string
    {
        $moment = $at !== null
            ? CarbonImmutable::instance(CarbonImmutable::parse($at))
            : CarbonImmutable::now();

        return $moment->format('Y-m-d\TH:i:sP');
    }

    /**
     * Amounts arrive as "25500.00"; integer rupiah is used everywhere inside
     * this application.
     *
     * Returns null rather than zero when the value is unreadable. Zero is a
     * real amount, and treating a malformed field as zero would silently settle
     * a payment for nothing.
     */
    public static function amountToRupiah(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (! is_string($value) || preg_match('/^\d{1,16}(\.\d{1,2})?$/', $value) !== 1) {
            return null;
        }

        return (int) round((float) $value);
    }

    /** The inverse: 25500 becomes "25500.00", per ISO-4217 as SNAP requires. */
    public static function rupiahToAmount(int $rupiah): string
    {
        return number_format($rupiah, 2, '.', '');
    }
}
