<?php

namespace App\Payouts;

use App\Contracts\AccountInquiry;
use App\Payments\Dana\DanaClient;
use App\Payments\Dana\DanaCredentials;
use App\Payments\Dana\DanaExternalIdGenerator;
use App\Payouts\Inquiry\DanaAccountInquiry;
use App\Payouts\Inquiry\NullAccountInquiry;
use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Builds whichever account-inquiry driver is configured.
 *
 * Falls back to the null driver on any failure rather than letting a
 * misconfiguration break the page. Somebody adding their bank account should
 * be told that verification is unavailable, not shown a stack trace - and
 * they must still be able to add the account, because a payout screen that
 * cannot accept a destination is worse than one that cannot verify it.
 */
class AccountInquiryManager
{
    private ?AccountInquiry $resolved = null;

    public function __construct(
        private readonly Config $config,
        private readonly Http $http,
    ) {}

    public function driver(): AccountInquiry
    {
        return $this->resolved ??= $this->build();
    }

    private function build(): AccountInquiry
    {
        $name = (string) $this->config->get('patungan.payout.inquiry', 'none');

        if ($name === 'none') {
            return new NullAccountInquiry;
        }

        try {
            return match ($name) {
                'dana' => $this->makeDana(),
                default => new NullAccountInquiry,
            };
        } catch (Throwable $e) {
            Log::warning('Account inquiry driver could not be built', [
                'driver' => $name,
                'error' => $e->getMessage(),
            ]);

            return new NullAccountInquiry;
        }
    }

    private function makeDana(): DanaAccountInquiry
    {
        $credentials = DanaCredentials::fromConfig($this->config);
        $externalIds = new DanaExternalIdGenerator;

        return new DanaAccountInquiry(
            new DanaClient($credentials, $externalIds, $this->http),
            $credentials,
            $externalIds,
            (string) $this->config->get('dana.inquiry_endpoint', DanaAccountInquiry::DEFAULT_ENDPOINT),
        );
    }
}
