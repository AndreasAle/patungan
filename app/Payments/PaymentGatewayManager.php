<?php

namespace App\Payments;

use App\Contracts\PaymentGateway;
use App\Payments\Gateways\MidtransGateway;
use App\Payments\Gateways\SandboxGateway;
use Illuminate\Contracts\Config\Repository as Config;
use RuntimeException;

class PaymentGatewayManager
{
    /** @var array<string, PaymentGateway> */
    private array $resolved = [];

    public function __construct(
        private readonly Config $config,
        private readonly string $environment,
    ) {}

    public function default(): PaymentGateway
    {
        return $this->driver($this->config->get('patungan.gateway'));
    }

    public function driver(string $name): PaymentGateway
    {
        return $this->resolved[$name] ??= match ($name) {
            'midtrans' => $this->makeMidtrans(),
            'sandbox' => $this->makeSandbox(),
            default => throw new RuntimeException("Payment gateway [{$name}] is not supported."),
        };
    }

    private function makeMidtrans(): MidtransGateway
    {
        $serverKey = $this->config->get('patungan.midtrans.server_key');

        if (blank($serverKey)) {
            throw new RuntimeException('MIDTRANS_SERVER_KEY is not configured.');
        }

        return new MidtransGateway($serverKey, (bool) $this->config->get('patungan.midtrans.production'));
    }

    private function makeSandbox(): SandboxGateway
    {
        if (! in_array($this->environment, ['local', 'testing'], true)) {
            throw new RuntimeException(
                'The sandbox payment driver simulates payments and cannot run outside local/testing. '.
                'Set PAYMENT_GATEWAY=midtrans and provide real credentials.'
            );
        }

        return new SandboxGateway((string) $this->config->get('app.key'));
    }
}
