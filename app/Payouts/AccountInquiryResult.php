<?php

namespace App\Payouts;

/**
 * What a bank said about an account number.
 *
 * Three outcomes, kept distinct on purpose. "The bank says this account does
 * not exist" and "we could not reach the provider" look identical to a user
 * but mean opposite things to the system: one is a wrong number the person
 * should fix, the other is our problem and must never be reported as their
 * mistake.
 */
final readonly class AccountInquiryResult
{
    private function __construct(
        public bool $found,
        public bool $available,
        public ?string $accountHolder,
        public ?string $reason,
    ) {}

    /** The bank returned a holder name. */
    public static function found(string $accountHolder): self
    {
        return new self(found: true, available: true, accountHolder: trim($accountHolder), reason: null);
    }

    /** The provider answered, and there is no such account. */
    public static function notFound(?string $reason = null): self
    {
        return new self(found: false, available: true, accountHolder: null, reason: $reason);
    }

    /**
     * Inquiry could not run - not configured, provider down, request failed.
     *
     * Deliberately not the same as notFound. Telling somebody their account
     * number is wrong because our provider was unreachable sends them to their
     * bank to fix a problem that is ours.
     */
    public static function unavailable(?string $reason = null): self
    {
        return new self(found: false, available: false, accountHolder: null, reason: $reason);
    }
}
