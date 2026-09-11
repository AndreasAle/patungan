<?php

namespace App\Payouts;

use App\Enums\AccountVerificationStatus;
use App\Models\User;

/**
 * Asks the bank who owns an account, and decides whether that is the person
 * asking.
 *
 * The terms already require a payout destination to be in the organizer's own
 * name. Before this existed nothing enforced it - the holder name was simply
 * typed in, so any name could sit against any account number. This is what
 * turns that sentence into a check.
 *
 * What it is honestly not: proof. A determined person can open an account, or
 * change the name on their profile, and pass. It raises the cost of routing
 * collected money to somebody else's account and it catches the ordinary
 * mistake of a mistyped digit, which between them cover almost everything that
 * actually happens. Treating it as proof would be the dangerous reading.
 */
class AccountVerifier
{
    public function __construct(
        private readonly AccountInquiryManager $inquiries,
        private readonly AccountNameMatcher $matcher,
    ) {}

    public function isAvailable(): bool
    {
        return $this->inquiries->driver()->isAvailable();
    }

    /**
     * @return array{
     *     status: AccountVerificationStatus,
     *     account_holder: string|null,
     *     found: bool,
     *     message: string,
     * }
     */
    public function verify(User $owner, string $providerCode, string $accountNumber): array
    {
        $result = $this->inquiries->driver()->inquire($providerCode, $this->digits($accountNumber));

        if (! $result->available) {
            return [
                'status' => AccountVerificationStatus::Unavailable,
                'account_holder' => null,
                'found' => false,
                'message' => $result->reason ?? 'Verifikasi rekening sedang tidak tersedia.',
            ];
        }

        if (! $result->found || $result->accountHolder === null) {
            return [
                'status' => AccountVerificationStatus::Unverified,
                'account_holder' => null,
                'found' => false,
                'message' => 'Rekening tidak ditemukan. Cek lagi nomornya.',
            ];
        }

        $matches = $this->matcher->matches($owner->name, $result->accountHolder);

        return [
            'status' => $matches ? AccountVerificationStatus::Verified : AccountVerificationStatus::Mismatch,
            'account_holder' => $result->accountHolder,
            'found' => true,
            /*
             * A mismatch is explained, not refused. Somebody whose bank record
             * carries a married name or an abbreviation needs to know what to
             * do next, and "ditolak" tells them nothing.
             */
            'message' => $matches
                ? 'Rekening terverifikasi atas nama kamu.'
                : 'Nama pemilik rekening berbeda dengan nama akun kamu. Pencairan ke rekening ini akan diperiksa dulu.',
        ];
    }

    /** Banks care about digits; people type spaces and dashes. */
    private function digits(string $accountNumber): string
    {
        return (string) preg_replace('/\D+/', '', $accountNumber);
    }
}
