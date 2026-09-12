<?php

namespace App\Otp;

use App\Contracts\OtpSender;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Support\Facades\Log;

/**
 * Writes the code to the log instead of sending it.
 *
 * For local work, where paying for an SMS to read your own screen is absurd.
 *
 * It refuses to be available in production, and that refusal is the whole point
 * rather than tidiness. PayoutRiskPolicy holds a payout until the phone is
 * verified, so a driver that pretended to send in production would mint
 * verified phones nobody can actually be warned on - and the protection would
 * read as satisfied while being worth nothing. Shipping without configuring a
 * real provider therefore leaves payouts queued for an operator, which is the
 * safe way to be wrong.
 */
class LogOtpSender implements OtpSender
{
    public function __construct(private readonly Application $app) {}

    public function name(): string
    {
        return 'log';
    }

    public function isAvailable(): bool
    {
        return ! $this->app->environment('production');
    }

    public function send(string $phone, string $message): bool
    {
        if (! $this->isAvailable()) {
            return false;
        }

        Log::info('OTP (not actually sent)', ['phone' => $phone, 'message' => $message]);

        return true;
    }
}
