<?php

namespace App\Contracts;

use App\Payouts\AccountInquiryResult;

/**
 * Asks a provider who owns a bank account.
 *
 * Implementations must never throw. A failed inquiry is an ordinary event -
 * networks drop, providers have outages - and it must degrade into an
 * "unavailable" result rather than break the page where somebody is trying to
 * add their own bank account.
 */
interface AccountInquiry
{
    public function name(): string;

    /** Whether this driver can actually ask anybody. */
    public function isAvailable(): bool;

    /**
     * @param  string  $providerCode  bank or wallet code, e.g. "BCA"
     * @param  string  $accountNumber  digits only, as the person typed them
     */
    public function inquire(string $providerCode, string $accountNumber): AccountInquiryResult;
}
