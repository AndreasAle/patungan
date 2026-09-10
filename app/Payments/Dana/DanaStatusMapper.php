<?php

namespace App\Payments\Dana;

use App\Enums\PaymentStatus;
use App\Payments\Snap\SnapJson;

/**
 * The only place a DANA status code becomes one of our payment statuses.
 *
 * latestTransactionStatus, from DANA's Query Payment and Finish Notify
 * references:
 *
 *   00  Success   - final state, the order has been paid
 *   01  Initiated - created but not paid
 *   02  Paying    - in process, not final, payment succeeded
 *   05  Cancelled - the order has been closed (expiry lands here too)
 *   07  Not found - DANA has no such order
 *
 * Two of these deserve their reasoning written down.
 *
 * 02 "Paying" maps to PENDING, not PAID, even though DANA's own wording says
 * "payment is success". It is explicitly not a final state, and crediting an
 * organizer from a non-final status would hand out money that can still be
 * reversed. Reconciliation will see 00 shortly afterwards.
 *
 * 07 "Not found" maps to PENDING, not FAILED. It usually means the query raced
 * ahead of DANA's own write, and marking a payment failed because we asked too
 * early would strand a participant who is midway through paying.
 *
 * Anything unrecognised stays PENDING for the same reason: guessing PAID
 * credits money that may never have moved, guessing FAILED strands somebody
 * who already paid.
 */
final class DanaStatusMapper
{
    public const SUCCESS = '00';

    public const INITIATED = '01';

    public const PAYING = '02';

    public const CANCELLED = '05';

    public const NOT_FOUND = '07';

    public static function fromTransactionStatus(?string $status): PaymentStatus
    {
        return match ($status) {
            self::SUCCESS => PaymentStatus::Paid,
            self::CANCELLED => PaymentStatus::Cancelled,
            default => PaymentStatus::Pending,
        };
    }

    /**
     * DANA response codes are HTTP status + service code + case code, so a
     * QRIS generate succeeds with 2004700 and a status query with 2005500.
     */
    public static function isSuccessResponse(?string $responseCode): bool
    {
        return is_string($responseCode) && str_starts_with($responseCode, '200');
    }

    /**
     * Whether DANA is telling us to try again later rather than to give up.
     *
     * Their reference marks 5xx and 202 as "mark as pending, retry"; treating
     * those as a hard failure would cancel invoices that are still alive.
     */
    public static function isRetryableResponse(?string $responseCode): bool
    {
        return is_string($responseCode)
            && (str_starts_with($responseCode, '5') || str_starts_with($responseCode, '202'));
    }

    /** Amounts arrive as "25500.00"; integer rupiah is used everywhere here. */
    public static function amountToRupiah(mixed $value): ?int
    {
        return SnapJson::amountToRupiah($value);
    }

    /** The inverse: 25500 becomes "25500.00", the format DANA requires. */
    public static function rupiahToAmount(int $rupiah): string
    {
        return SnapJson::rupiahToAmount($rupiah);
    }
}
