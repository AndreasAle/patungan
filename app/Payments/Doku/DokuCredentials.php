<?php

namespace App\Payments\Doku;

use App\Payments\Doku\Exceptions\DokuAuthenticationException;
use Illuminate\Contracts\Config\Repository as Config;

/**
 * Resolved DOKU settings, with the key files read from disk once.
 *
 * Nothing here is ever serialised into a response or a log; the client secret
 * and private key stay inside this object.
 */
final class DokuCredentials
{
    private ?string $privateKey = null;

    private ?string $dokuPublicKey = null;

    public function __construct(
        public readonly string $baseUrl,
        public readonly string $clientId,
        private readonly string $clientSecret,
        private readonly ?string $merchantId,
        public readonly string $terminalId,
        public readonly string $channelId,
        public readonly ?string $privateKeyPath,
        public readonly ?string $dokuPublicKeyPath,
        public readonly ?string $notificationUrl,
        public readonly int $connectTimeout,
        public readonly int $timeout,
        public readonly bool $production,
        public readonly bool $splitSettlementEnabled,
        public readonly bool $payoutEnabled,
    ) {}

    public static function fromConfig(Config $config): self
    {
        $get = static fn (string $key, $default = null) => $config->get("doku.{$key}", $default);

        /*
         * Only what authentication needs is required up front. The Mall ID is
         * checked at the point a QR is generated instead, so someone can prove
         * their key and secret work while DOKU is still telling them what their
         * Mall ID is.
         */
        foreach (['client_id', 'client_secret'] as $required) {
            if (blank($get($required))) {
                throw new DokuAuthenticationException(context: [
                    'reason' => 'DOKU_'.strtoupper($required).' is not configured.',
                ]);
            }
        }

        $environment = (string) $get('environment', 'sandbox');

        return new self(
            baseUrl: rtrim((string) $get('base_url'), '/'),
            clientId: (string) $get('client_id'),
            clientSecret: (string) $get('client_secret'),
            merchantId: $get('merchant_id'),
            terminalId: (string) $get('terminal_id', 'PTGN01'),
            channelId: (string) $get('channel_id', 'H2H'),
            privateKeyPath: $get('private_key_path'),
            dokuPublicKeyPath: $get('doku_public_key_path'),
            notificationUrl: $get('notification_url'),
            connectTimeout: (int) $get('http.connect_timeout', 10),
            timeout: (int) $get('http.timeout', 30),
            production: $environment === 'production',
            splitSettlementEnabled: (bool) $get('split_settlement.enabled', false),
            payoutEnabled: (bool) $get('payout.enabled', false),
        );
    }

    public function clientSecret(): string
    {
        return $this->clientSecret;
    }

    /** The Mall ID DOKU issues per merchant. Required by every QRIS call. */
    public function merchantId(): string
    {
        if (blank($this->merchantId)) {
            throw new DokuAuthenticationException(context: [
                'reason' => 'DOKU_MERCHANT_ID (Mall ID) is not configured.',
            ]);
        }

        return $this->merchantId;
    }

    /** Whether a Mall ID is present, without throwing - for diagnostics. */
    public function hasMerchantId(): bool
    {
        return filled($this->merchantId);
    }

    public function privateKey(): string
    {
        return $this->privateKey ??= $this->readKey($this->privateKeyPath, 'DOKU_PRIVATE_KEY_PATH');
    }

    /** DOKU's public key, used to verify the notifications they send us. */
    public function dokuPublicKey(): ?string
    {
        if ($this->dokuPublicKeyPath === null) {
            return null;
        }

        return $this->dokuPublicKey ??= $this->readKey($this->dokuPublicKeyPath, 'DOKU_DOKU_PUBLIC_KEY_PATH');
    }

    /**
     * The path DOKU signs when it calls us. Taken from the configured
     * notification URL so it matches what was registered in the dashboard.
     */
    public function notificationPath(): ?string
    {
        if (blank($this->notificationUrl)) {
            return null;
        }

        $path = parse_url($this->notificationUrl, PHP_URL_PATH);

        return is_string($path) ? '/'.ltrim($path, '/') : null;
    }

    private function readKey(?string $path, string $envName): string
    {
        if (blank($path)) {
            throw new DokuAuthenticationException(context: ['reason' => "{$envName} is not configured."]);
        }

        $resolved = str_starts_with($path, '/') || preg_match('/^[A-Za-z]:[\\\\\/]/', $path) === 1
            ? $path
            : base_path($path);

        if (! is_readable($resolved)) {
            throw new DokuAuthenticationException(context: ['reason' => "{$envName} points at a file that cannot be read."]);
        }

        $contents = file_get_contents($resolved);

        if ($contents === false || trim($contents) === '') {
            throw new DokuAuthenticationException(context: ['reason' => "{$envName} points at an empty file."]);
        }

        return $contents;
    }
}
