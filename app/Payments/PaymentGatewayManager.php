<?php

namespace App\Payments;

use App\Contracts\PaymentGateway;
use App\Payments\Dana\DanaClient;
use App\Payments\Dana\DanaCredentials;
use App\Payments\Dana\DanaExternalIdGenerator;
use App\Payments\Dana\DanaGateway;
use App\Payments\Dana\DanaNotificationVerifier;
use App\Payments\Dana\DanaQrisService;
use App\Payments\Doku\DokuAccessToken;
use App\Payments\Doku\DokuClient;
use App\Payments\Doku\DokuCredentials;
use App\Payments\Doku\DokuExternalIdGenerator;
use App\Payments\Doku\DokuGateway;
use App\Payments\Doku\DokuNotificationVerifier;
use App\Payments\Doku\DokuQrisService;
use App\Payments\Gateways\MidtransGateway;
use App\Payments\Gateways\SandboxGateway;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Contracts\Config\Repository as Config;
use Illuminate\Http\Client\Factory as Http;

class PaymentGatewayManager
{
    /**
     * What a participant sees when the gateway itself is misconfigured.
     *
     * They cannot act on the real reason and must never be shown it, but a
     * plain 500 tells them nothing either. The cause travels as $previous so
     * it still reaches the log.
     */
    private const UNAVAILABLE = 'Pembayaran belum bisa dibuat sekarang. Coba lagi beberapa saat lagi.';

    /** @var array<string, PaymentGateway> */
    private array $resolved = [];

    public function __construct(
        private readonly Config $config,
        private readonly string $environment,
        private readonly Cache $cache,
        private readonly Http $http,
    ) {}

    public function default(): PaymentGateway
    {
        return $this->driver($this->config->get('patungan.gateway'));
    }

    public function driver(string $name): PaymentGateway
    {
        return $this->resolved[$name] ??= match ($name) {
            'dana' => $this->makeDana(),
            'doku' => $this->makeDoku(),
            'midtrans' => $this->makeMidtrans(),
            'sandbox' => $this->makeSandbox(),
            default => throw new PaymentGatewayException(
                self::UNAVAILABLE,
                previous: new \RuntimeException("Payment gateway [{$name}] is not supported."),
            ),
        };
    }

    /**
     * DANA SNAP QRIS MPM. Credentials are validated as the driver is built, so
     * a misconfiguration surfaces here rather than when a participant taps
     * Bayar.
     *
     * There is no access token to construct: DANA's QRIS Acquirer APIs are
     * authenticated by the RSA signature on each request.
     */
    private function makeDana(): DanaGateway
    {
        $credentials = DanaCredentials::fromConfig($this->config);
        $externalIds = new DanaExternalIdGenerator;

        return new DanaGateway(
            new DanaQrisService(new DanaClient($credentials, $externalIds, $this->http), $credentials),
            new DanaNotificationVerifier($credentials),
            $externalIds,
        );
    }

    /**
     * DOKU SNAP. Credentials are validated as the driver is built, so a
     * misconfiguration surfaces immediately rather than at charge time.
     */
    private function makeDoku(): DokuGateway
    {
        $credentials = DokuCredentials::fromConfig($this->config);
        $externalIds = new DokuExternalIdGenerator;

        $client = new DokuClient(
            $credentials,
            new DokuAccessToken($credentials, $this->cache, $this->http),
            $externalIds,
            $this->http,
        );

        return new DokuGateway(
            new DokuQrisService($client, $credentials),
            new DokuNotificationVerifier($credentials),
            $externalIds,
        );
    }

    private function makeMidtrans(): MidtransGateway
    {
        $serverKey = $this->config->get('patungan.midtrans.server_key');

        if (blank($serverKey)) {
            throw new PaymentGatewayException(
                self::UNAVAILABLE,
                previous: new \RuntimeException('MIDTRANS_SERVER_KEY is not configured.'),
            );
        }

        return new MidtransGateway($serverKey, (bool) $this->config->get('patungan.midtrans.production'));
    }

    private function makeSandbox(): SandboxGateway
    {
        if (! in_array($this->environment, ['local', 'testing'], true)) {
            throw new PaymentGatewayException(
                self::UNAVAILABLE,
                previous: new \RuntimeException(
                    'The sandbox payment driver simulates payments and cannot run outside local/testing. '.
                    'Set PAYMENT_GATEWAY to a real driver and provide credentials.'
                ),
            );
        }

        return new SandboxGateway((string) $this->config->get('app.key'));
    }
}
