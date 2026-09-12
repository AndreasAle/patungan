<?php

namespace App\Otp;

use App\Contracts\OtpSender;

/**
 * No provider is configured, and the app says so plainly.
 *
 * The default. Nothing is sent, nothing pretends to have been sent, and
 * PayoutRiskPolicy keeps holding payouts for an operator because no phone can
 * be verified. That is the correct resting state for an app that has not been
 * given an SMS account yet.
 */
class NullOtpSender implements OtpSender
{
    public function name(): string
    {
        return 'none';
    }

    public function isAvailable(): bool
    {
        return false;
    }

    public function send(string $phone, string $message): bool
    {
        return false;
    }
}
