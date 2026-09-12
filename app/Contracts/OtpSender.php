<?php

namespace App\Contracts;

/**
 * Sends a one-time code to a phone number.
 *
 * Implementations must never throw. A provider outage is an ordinary event, and
 * it has to degrade into "we could not send it" rather than break the page
 * where somebody is trying to secure their own account.
 */
interface OtpSender
{
    public function name(): string;

    /**
     * Whether this driver can really reach a phone.
     *
     * The distinction matters more than it looks: PayoutRiskPolicy treats an
     * unverified phone as a reason to hold a payout, so a driver that quietly
     * pretends to send would hand out verified phones that nobody can actually
     * be warned on.
     */
    public function isAvailable(): bool;

    public function send(string $phone, string $message): bool;
}
