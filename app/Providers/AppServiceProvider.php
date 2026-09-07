<?php

namespace App\Providers;

use App\Contracts\DnsResolver;
use App\Contracts\PaymentGateway;
use App\Contracts\PayoutProvider;
use App\Models\Patungan;
use App\Models\Settlement;
use App\Payments\PaymentGatewayManager;
use App\Payments\Payouts\DokuPayoutProvider;
use App\Payments\Payouts\ManualPayoutProvider;
use App\Policies\PatunganPolicy;
use App\Policies\SettlementPolicy;
use App\Support\SystemDnsResolver;
use Illuminate\Http\Client\Factory;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(DnsResolver::class, SystemDnsResolver::class);

        $this->app->singleton(PaymentGatewayManager::class, fn ($app) => new PaymentGatewayManager(
            $app['config'],
            $app->environment(),
            $app['cache']->store(),
            $app[Factory::class],
        ));

        $this->app->bind(PaymentGateway::class, fn ($app) => $app->make(PaymentGatewayManager::class)->default());

        $this->app->singleton(PayoutProvider::class, function ($app) {
            $provider = $app['config']->get('patungan.payout.provider');

            return match ($provider) {
                'manual' => new ManualPayoutProvider,
                'doku' => new DokuPayoutProvider((bool) $app['config']->get('doku.payout.enabled')),
                default => throw new RuntimeException("Payout provider [{$provider}] is not supported."),
            };
        });
    }

    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        Gate::policy(Patungan::class, PatunganPolicy::class);
        Gate::policy(Settlement::class, SettlementPolicy::class);
    }
}
