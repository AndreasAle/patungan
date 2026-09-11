<?php

namespace App\Payouts\Inquiry;

use App\Contracts\AccountInquiry;
use App\Payouts\AccountInquiryResult;

/**
 * The driver used when no provider can verify accounts.
 *
 * It exists so the rest of the application never has to ask whether inquiry is
 * configured. Every caller gets a result object; this one always says
 * "unavailable", which the UI reports honestly as verification not being
 * possible rather than as the account being wrong.
 */
final class NullAccountInquiry implements AccountInquiry
{
    public function name(): string
    {
        return 'none';
    }

    public function isAvailable(): bool
    {
        return false;
    }

    public function inquire(string $providerCode, string $accountNumber): AccountInquiryResult
    {
        return AccountInquiryResult::unavailable('Verifikasi rekening belum aktif.');
    }
}
