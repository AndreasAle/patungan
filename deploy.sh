#!/usr/bin/env bash
#
# Deploys the current main branch on the server.
#
# Run it from the application directory (the one holding artisan), not from the
# web root. Assets are already built and committed, so no Node is needed here.
#
#   cd ~/patungan-app && ./deploy.sh
#
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f artisan ]; then
    echo "Run this from the Laravel application directory (the one with artisan)." >&2
    exit 1
fi

if [ ! -f .env ]; then
    echo ".env is missing. Create it on the server first - it is never committed." >&2
    exit 1
fi

echo "==> Pulling main"
git pull --ff-only origin main

echo "==> Installing PHP dependencies (production)"
composer install --no-dev --optimize-autoloader --no-interaction --prefer-dist

echo "==> Putting the site into maintenance mode"
php artisan down --render="errors::503" --retry=15 || true

# Anything that fails from here still lifts maintenance mode on the way out.
trap 'php artisan up || true' EXIT

echo "==> Running database migrations"
php artisan migrate --force

echo "==> Linking storage"
php artisan storage:link 2>/dev/null || true

echo "==> Rebuilding caches"
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> Checking the payment gateway can actually be resolved"
# Better to find out here than when the first participant taps Bayar.
php artisan tinker --execute="
try {
    \$g = app(App\Payments\PaymentGatewayManager::class)->default();
    echo '    gateway ok: ' . \$g->name() . PHP_EOL;
} catch (Throwable \$e) {
    echo '    GATEWAY NOT USABLE: ' . \$e->getMessage() . PHP_EOL;
    echo '    Payments will fail until this is fixed.' . PHP_EOL;
}
" || true

echo "==> Done"
