<?php

namespace App\Console\Commands;

use App\Payments\Doku\DokuAccessToken;
use App\Payments\Doku\DokuCredentials;
use App\Payments\Doku\Exceptions\DokuException;
use Illuminate\Console\Command;
use Illuminate\Http\Client\Factory as Http;
use Throwable;

/**
 * Checks the DOKU setup and, when asked, proves the credentials work by
 * fetching a real B2B access token.
 *
 * Nothing secret is printed: values are reported as present or missing only.
 */
class DokuDoctor extends Command
{
    protected $signature = 'doku:doctor {--token : Actually request a B2B access token from DOKU}';

    protected $description = 'Verify the DOKU SNAP configuration, and optionally the credentials themselves';

    public function handle(Http $http): int
    {
        try {
            $credentials = DokuCredentials::fromConfig(config());
        } catch (DokuException $e) {
            $this->error('Configuration incomplete: '.($e->context['reason'] ?? 'unknown'));

            return self::FAILURE;
        }

        $this->line('');
        $this->components->twoColumnDetail('<fg=gray>Setting</>', '<fg=gray>Value</>');
        $this->components->twoColumnDetail('Environment', $credentials->production ? '<fg=yellow>production</>' : 'sandbox');
        $this->components->twoColumnDetail('Base URL', $credentials->baseUrl);
        $this->components->twoColumnDetail('Client ID', $this->mask($credentials->clientId));
        $this->components->twoColumnDetail('Client secret', '<fg=green>set</>');
        $this->components->twoColumnDetail('Merchant ID (Mall ID)', $credentials->hasMerchantId()
            ? $this->mask($credentials->merchantId())
            : '<fg=yellow>not set - needed to generate a QR, not to fetch a token</>');
        $this->components->twoColumnDetail('Terminal ID', $credentials->terminalId);
        $this->components->twoColumnDetail('Channel ID', $credentials->channelId);
        $this->components->twoColumnDetail('Notification URL', $credentials->notificationUrl ?? '<fg=red>not set</>');
        $this->components->twoColumnDetail('Notification path (signed)', $credentials->notificationPath() ?? '<fg=red>unknown</>');
        $this->components->twoColumnDetail('Split settlement', $credentials->splitSettlementEnabled ? 'enabled' : 'disabled (flag off)');
        $this->components->twoColumnDetail('Payout (Kirim DOKU)', $credentials->payoutEnabled ? 'enabled' : 'disabled (flag off)');

        $ok = true;
        $ok = $this->checkKey('Private key', fn () => $credentials->privateKey(), 'PRIVATE KEY') && $ok;
        $ok = $this->checkDokuPublicKey($credentials) && $ok;

        if ($credentials->notificationUrl === null) {
            $this->components->warn('DOKU_PAYMENT_NOTIFICATION_URL is unset. Its path is part of the signed string, so symmetric verification cannot be checked against it.');
        }

        if ($this->option('token')) {
            $ok = $this->checkToken($credentials, $http) && $ok;
        } else {
            $this->line('');
            $this->components->info('Run with --token to fetch a real access token and prove the credentials work.');
        }

        return $ok ? self::SUCCESS : self::FAILURE;
    }

    private function checkKey(string $label, callable $read, string $marker): bool
    {
        try {
            $contents = $read();
        } catch (DokuException $e) {
            $this->components->twoColumnDetail($label, '<fg=red>'.($e->context['reason'] ?? 'unreadable').'</>');

            return false;
        }

        if (! str_contains($contents, $marker)) {
            $this->components->twoColumnDetail($label, '<fg=red>does not look like a PEM '.strtolower($marker).'</>');

            return false;
        }

        $this->components->twoColumnDetail($label, '<fg=green>readable</>');

        return true;
    }

    private function checkDokuPublicKey(DokuCredentials $credentials): bool
    {
        if ($credentials->dokuPublicKeyPath === null) {
            $this->components->twoColumnDetail(
                "DOKU's public key",
                '<fg=yellow>not set - notifications fall back to symmetric verification only</>',
            );

            return true;
        }

        return $this->checkKey("DOKU's public key", fn () => $credentials->dokuPublicKey(), 'PUBLIC KEY');
    }

    private function checkToken(DokuCredentials $credentials, Http $http): bool
    {
        $this->line('');

        try {
            $token = (new DokuAccessToken($credentials, cache()->store(), $http))->refresh();
        } catch (Throwable $e) {
            $reason = $e instanceof DokuException ? ($e->context['reason'] ?? $e->getMessage()) : $e->getMessage();

            $this->components->error('B2B access token: '.$reason);
            $this->hintForTokenFailure();

            return false;
        }

        $this->components->info('B2B access token received. The credentials and the signing key both work.');

        return $token !== '';
    }

    /**
     * The token request fails in only a few ways, and the log line alone rarely
     * tells someone which one they are in.
     */
    private function hintForTokenFailure(): void
    {
        $this->line('  <fg=gray>Most likely causes, in order:</>');
        $this->line('  <fg=gray>1. The Merchant Public Key is not saved in the DOKU dashboard yet.</>');
        $this->line('  <fg=gray>   DOKU cannot verify our signature without it and reports an unknown client.</>');
        $this->line('  <fg=gray>2. DOKU_CLIENT_ID does not match the environment in DOKU_BASE_URL.</>');
        $this->line('  <fg=gray>3. The public key uploaded to DOKU is not the pair of DOKU_PRIVATE_KEY_PATH.</>');
        $this->newLine();
        $this->line('  <fg=gray>The exact provider response is in storage/logs/doku-*.log.</>');
    }

    /** Shows enough to recognise a value, never enough to use it. */
    private function mask(string $value): string
    {
        if (strlen($value) <= 8) {
            return str_repeat('*', strlen($value));
        }

        return substr($value, 0, 4).str_repeat('*', 6).substr($value, -4);
    }
}
