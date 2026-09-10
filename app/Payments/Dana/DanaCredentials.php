<?php

namespace App\Payments\Dana;

use App\Payments\Dana\Exceptions\DanaAuthenticationException;
use Illuminate\Contracts\Config\Repository as Config;

/**
 * Resolved DANA settings, with the key files read from disk once and never
 * serialised into a response or a log.
 *
 * Nothing is read from the environment after construction, so a driver that
 * built successfully cannot later start using different credentials.
 */
final class DanaCredentials
{
    private ?string $privateKey = null;

    private ?string $danaPublicKey = null;

    public function __construct(
        public readonly string $baseUrl,
        /** DANA calls this the Client ID; it travels as X-PARTNER-ID. */
        public readonly string $partnerId,
        private readonly ?string $merchantId,
        public readonly ?string $storeId,
        public readonly ?string $subMerchantId,
        public readonly string $channelId,
        public readonly ?string $origin,
        public readonly ?string $privateKeyPath,
        public readonly ?string $danaPublicKeyPath,
        public readonly ?string $notificationUrl,
        public readonly int $connectTimeout,
        public readonly int $timeout,
        public readonly bool $production,
    ) {}

    public static function fromConfig(Config $config): self
    {
        $get = static fn (string $key, $default = null) => $config->get("dana.{$key}", $default);

        /*
         * Only what signing needs is demanded up front. The merchant id is
         * checked where a QR is actually generated, so an operator can prove
         * their keys work while DANA is still issuing the rest.
         */
        if (blank($get('partner_id'))) {
            throw new DanaAuthenticationException(context: [
                'reason' => 'DANA_PARTNER_ID (Client ID) is not configured.',
            ]);
        }

        $environment = (string) $get('environment', 'sandbox');
        $baseUrl = rtrim((string) $get('base_url'), '/');

        if ($baseUrl === '') {
            throw new DanaAuthenticationException(context: ['reason' => 'DANA_BASE_URL is not configured.']);
        }

        self::guardEnvironmentMatchesHost($environment, $baseUrl);

        return new self(
            baseUrl: $baseUrl,
            partnerId: (string) $get('partner_id'),
            merchantId: $get('merchant_id'),
            storeId: $get('store_id'),
            subMerchantId: $get('sub_merchant_id'),
            channelId: (string) $get('channel_id', '95221'),
            origin: $get('origin'),
            privateKeyPath: $get('private_key_path'),
            danaPublicKeyPath: $get('dana_public_key_path'),
            notificationUrl: $get('notification_url'),
            connectTimeout: (int) $get('http.connect_timeout', 10),
            timeout: (int) $get('http.timeout', 30),
            production: $environment === 'production',
        );
    }

    /**
     * Refuses the one combination that quietly moves real money.
     *
     * DANA_ENV is what the operator believes they are running and what the
     * doctor prints back at them. If it says sandbox while the host is the live
     * one, every payment is real while everyone involved thinks it is a test.
     * An unrecognised host is left alone - it may legitimately be a proxy.
     */
    private static function guardEnvironmentMatchesHost(string $environment, string $baseUrl): void
    {
        $host = (string) parse_url($baseUrl, PHP_URL_HOST);
        $production = $environment === 'production';
        $looksSandbox = str_contains($host, 'sandbox');

        if ($host !== '' && ! $looksSandbox && str_ends_with($host, 'dana.id') && ! $production) {
            throw new DanaAuthenticationException(context: [
                'reason' => 'DANA_BASE_URL points at a production host but DANA_ENV is "'.$environment.'". '
                    .'Set DANA_ENV=production if that is intended - real payments would otherwise run under a sandbox label.',
            ]);
        }

        if ($looksSandbox && $production) {
            throw new DanaAuthenticationException(context: [
                'reason' => 'DANA_ENV is production but DANA_BASE_URL points at a sandbox host. '
                    .'No live payment can succeed with this combination.',
            ]);
        }
    }

    /** The merchant id DANA issues. Required by every QRIS call. */
    public function merchantId(): string
    {
        if (blank($this->merchantId)) {
            throw new DanaAuthenticationException(context: [
                'reason' => 'DANA_MERCHANT_ID is not configured.',
            ]);
        }

        return $this->merchantId;
    }

    /** Whether a merchant id is present, without throwing - for diagnostics. */
    public function hasMerchantId(): bool
    {
        return filled($this->merchantId);
    }

    public function privateKey(): string
    {
        return $this->privateKey ??= $this->readKey($this->privateKeyPath, 'DANA_PRIVATE_KEY_PATH');
    }

    /** DANA's public key, used to verify the notifications they send us. */
    public function danaPublicKey(): ?string
    {
        if (blank($this->danaPublicKeyPath)) {
            return null;
        }

        return $this->danaPublicKey ??= $this->readKey($this->danaPublicKeyPath, 'DANA_DANA_PUBLIC_KEY_PATH');
    }

    public function hasDanaPublicKey(): bool
    {
        return filled($this->danaPublicKeyPath);
    }

    /**
     * The path DANA signs when it calls us, taken from the configured
     * notification URL so it matches what was registered in the portal.
     */
    public function notificationPath(): ?string
    {
        if (blank($this->notificationUrl)) {
            return null;
        }

        $path = parse_url($this->notificationUrl, PHP_URL_PATH);

        return is_string($path) && $path !== '' ? '/'.ltrim($path, '/') : null;
    }

    private function readKey(?string $path, string $envName): string
    {
        if (blank($path)) {
            throw new DanaAuthenticationException(context: ['reason' => "{$envName} is not configured."]);
        }

        $resolved = str_starts_with($path, '/') || preg_match('/^[A-Za-z]:[\\\\\/]/', $path) === 1
            ? $path
            : base_path($path);

        if (! is_readable($resolved)) {
            throw new DanaAuthenticationException(context: ['reason' => "{$envName} points at a file that cannot be read."]);
        }

        $contents = file_get_contents($resolved);

        if ($contents === false || trim($contents) === '') {
            throw new DanaAuthenticationException(context: ['reason' => "{$envName} points at an empty file."]);
        }

        return $contents;
    }
}
