<?php

namespace App\Enums;

/**
 * Whether a payout destination has been checked against the bank.
 *
 * The distinction that matters is between "we asked and the name did not
 * match" and "we could not ask". Collapsing those two into a single
 * unverified state would hide the only case that deserves attention: an
 * account whose real owner is somebody else.
 */
enum AccountVerificationStatus: string
{
    /** Never checked - typed in by hand, or added before verification existed. */
    case Unverified = 'UNVERIFIED';

    /** The bank returned a holder name and it matches the account owner. */
    case Verified = 'VERIFIED';

    /**
     * The bank returned a name that is not the account owner's.
     *
     * Not an automatic rejection. Indonesian bank records carry middle names,
     * married names and abbreviations that a strict comparison would reject
     * for perfectly legitimate accounts - so this is flagged for a human
     * rather than blocked outright.
     */
    case Mismatch = 'MISMATCH';

    /** The provider could not be reached, or inquiry is not enabled. */
    case Unavailable = 'UNAVAILABLE';

    public function label(): string
    {
        return match ($this) {
            self::Unverified => 'Belum diverifikasi',
            self::Verified => 'Terverifikasi',
            self::Mismatch => 'Nama tidak cocok',
            self::Unavailable => 'Verifikasi tidak tersedia',
        };
    }

    /** Whether a payout to this destination should be looked at first. */
    public function needsReview(): bool
    {
        return $this === self::Mismatch;
    }
}
