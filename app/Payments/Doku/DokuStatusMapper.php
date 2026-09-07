<?php

namespace App\Payments\Doku;

use App\Enums\PaymentStatus;

/**
 * The only place a DOKU status string becomes one of our payment statuses.
 *
 * latestTransactionStatus, per DOKU's SNAP notification reference:
 *   00 Success · 03 Pending · 04 Refunded · 05 Canceled · 06 Failed
 *
 * Anything unrecognised stays PENDING. Guessing PAID from an unknown code would
 * credit an organizer for money that may never have moved; guessing FAILED would
 * strand a participant who has already paid. Pending is the only safe default -
 * reconciliation resolves it later.
 */
final class DokuStatusMapper
{
    public const SUCCESS = '00';

    public static function fromTransactionStatus(?string $status): PaymentStatus
    {
        return match ($status) {
            '00' => PaymentStatus::Paid,
            '03' => PaymentStatus::Pending,
            '04' => PaymentStatus::Refunded,
            '05' => PaymentStatus::Cancelled,
            '06' => PaymentStatus::Failed,
            '07' => PaymentStatus::Expired,
            default => PaymentStatus::Pending,
        };
    }

    /**
     * DOKU response codes are HTTP status + service code + case code, so a
     * generate call succeeds with 2004700 and a query with 2005100.
     */
    public static function isSuccessResponse(?string $responseCode): bool
    {
        return is_string($responseCode) && str_starts_with($responseCode, '200');
    }

    /** Amounts arrive as "25500.00"; we keep integer rupiah everywhere. */
    public static function amountToRupiah(mixed $value): ?int
    {
        if (is_int($value)) {
            return $value;
        }

        if (! is_string($value) || ! preg_match('/^\d{1,16}(\.\d{1,2})?$/', $value)) {
            return null;
        }

        return (int) round((float) $value);
    }

    /** The inverse: 25500 becomes "25500.00", the format DOKU requires. */
    public static function rupiahToAmount(int $rupiah): string
    {
        return number_format($rupiah, 2, '.', '');
    }
}
