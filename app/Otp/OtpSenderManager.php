<?php

namespace App\Otp;

use App\Contracts\OtpSender;
use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Contracts\Container\Container;

/**
 * Picks the OTP driver named in config, and falls back to sending nothing.
 *
 * An unknown driver name resolves to NullOtpSender rather than throwing: a
 * typo in .env should leave phone verification unavailable and payouts queued,
 * not take down every page that touches a payout.
 */
class OtpSenderManager
{
    public function __construct(
        private readonly Container $container,
        private readonly Config $config,
    ) {}

    public function driver(): OtpSender
    {
        return match ((string) $this->config->get('patungan.otp.driver', 'none')) {
            'log' => $this->container->make(LogOtpSender::class),
            default => $this->container->make(NullOtpSender::class),
        };
    }
}
