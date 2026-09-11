<?php

namespace App\Console\Commands;

use App\Payments\Dana\DanaCredentials;
use App\Payments\Dana\DanaSignature;
use App\Payments\Dana\Exceptions\DanaException;
use Illuminate\Console\Command;
use Throwable;

/**
 * Checks the DANA setup before a payer finds a problem for you.
 *
 * Nothing secret is printed: keys and identifiers are reported as present,
 * masked, or missing. The one thing it does prove is that the private key can
 * actually produce a signature, which is the failure that otherwise surfaces as
 * an opaque rejection from DANA at the moment somebody tries to pay.
 *
 * There is no --token option as there is for DOKU: DANA's QRIS Acquirer APIs
 * carry no B2B access token, so there is nothing to fetch. The first real proof
 * the credentials work is a sandbox QRIS generate.
 */
class DanaDoctor extends Command
{
    protected $signature = 'dana:doctor';

    protected $description = 'Verify the DANA SNAP configuration and key material';

    public function handle(): int
    {
        try {
            $credentials = DanaCredentials::fromConfig(config());
        } catch (DanaException $e) {
            $this->error('Configuration incomplete: '.($e->context['reason'] ?? 'unknown'));

            return self::FAILURE;
        }

        $this->line('');
        $this->components->twoColumnDetail('<fg=gray>Setting</>', '<fg=gray>Value</>');
        $this->components->twoColumnDetail('Environment', $credentials->production ? '<fg=yellow>production</>' : 'sandbox');
        $this->components->twoColumnDetail('Base URL', $credentials->baseUrl);
        $this->components->twoColumnDetail('Partner ID (Client ID)', $this->mask($credentials->partnerId));
        $merchantReady = $credentials->hasMerchantId();
        $storeReady = $credentials->hasStoreId();
        $this->components->twoColumnDetail('Merchant ID', $merchantReady
            ? $this->mask($credentials->merchantId())
            : '<fg=red>not set - no QR can be generated without it</>');
        $this->components->twoColumnDetail('Store ID', $storeReady
            ? $credentials->storeId()
            : '<fg=red>not set - Generate QRIS requires it</>');
        $this->components->twoColumnDetail('Sub merchant ID', $credentials->subMerchantId ?? 'not set (optional)');
        $this->components->twoColumnDetail('Channel ID', $credentials->channelId);
        $this->components->twoColumnDetail('Origin', $credentials->origin ?? '<fg=yellow>not set</>');
        $this->components->twoColumnDetail('Notification URL', $credentials->notificationUrl ?? '<fg=red>not set</>');
        $this->components->twoColumnDetail('Notification path (signed)', $credentials->notificationPath() ?? '<fg=red>unknown</>');

        $ok = $merchantReady && $storeReady;
        $ok = $this->checkPrivateKey($credentials) && $ok;
        $ok = $this->checkDanaPublicKey($credentials) && $ok;

        if ($credentials->notificationUrl === null) {
            $this->components->warn(
                'DANA_NOTIFICATION_URL is unset. Its path is part of the string DANA signs, so a notification '
                .'arriving behind a proxy that rewrites the path could not be verified.'
            );
        }

        $this->line('');

        if (! $ok) {
            $this->components->error('DANA is not ready. Fix the items above before taking a payment.');

            return self::FAILURE;
        }

        $this->components->info('Configuration and key material look correct.');
        $this->line('  <fg=gray>This proves the settings load and the keys work. It does not prove DANA</>');
        $this->line('  <fg=gray>has activated QRIS for this merchant - only a sandbox charge shows that.</>');

        return self::SUCCESS;
    }

    /** Signs a throwaway string, which is the only real proof the key is usable. */
    private function checkPrivateKey(DanaCredentials $credentials): bool
    {
        try {
            $pem = $credentials->privateKey();
        } catch (Throwable $e) {
            $this->components->twoColumnDetail('Private key', '<fg=red>'.$this->reason($e).'</>');

            return false;
        }

        if (! str_contains($pem, 'PRIVATE KEY')) {
            $this->components->twoColumnDetail('Private key', '<fg=red>file does not look like a PEM private key</>');

            return false;
        }

        try {
            DanaSignature::sign('dana:doctor', $pem);
        } catch (Throwable $e) {
            $this->components->twoColumnDetail('Private key', '<fg=red>present but cannot sign: '.$this->reason($e).'</>');

            return false;
        }

        $this->components->twoColumnDetail('Private key', '<fg=green>readable and able to sign</>');

        return true;
    }

    /**
     * Without DANA's public key every notification is refused, so this is an
     * error rather than a warning: payments would still settle, but only
     * whenever reconciliation next ran.
     */
    private function checkDanaPublicKey(DanaCredentials $credentials): bool
    {
        if (! $credentials->hasDanaPublicKey()) {
            $this->components->twoColumnDetail(
                'DANA public key',
                '<fg=red>not set - every notification will be refused</>',
            );

            return false;
        }

        try {
            $pem = (string) $credentials->danaPublicKey();
        } catch (Throwable $e) {
            $this->components->twoColumnDetail('DANA public key', '<fg=red>'.$this->reason($e).'</>');

            return false;
        }

        if (openssl_pkey_get_public($pem) === false) {
            $this->components->twoColumnDetail('DANA public key', '<fg=red>present but OpenSSL cannot read it</>');

            return false;
        }

        $this->components->twoColumnDetail('DANA public key', '<fg=green>readable</>');

        return true;
    }

    private function reason(Throwable $e): string
    {
        return $e instanceof DanaException
            ? (string) ($e->context['reason'] ?? $e->getMessage())
            : $e->getMessage();
    }

    /** Enough to recognise a value, never enough to use it. */
    private function mask(string $value): string
    {
        if (strlen($value) <= 8) {
            return str_repeat('*', strlen($value));
        }

        return substr($value, 0, 4).str_repeat('*', 6).substr($value, -4);
    }
}
