<?php

namespace App\Http\Controllers\Admin;

use App\Enums\LedgerDirection;
use App\Enums\LedgerType;
use App\Enums\PatunganStatus;
use App\Enums\PaymentStatus;
use App\Enums\SettlementStatus;
use App\Http\Controllers\Controller;
use App\Models\Patungan;
use App\Models\Payment;
use App\Models\Settlement;
use App\Models\User;
use App\Models\WalletLedger;
use App\Support\AdminWindow;
use App\Support\PlatformHealth;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function __invoke(Request $request, PlatformHealth $health): Response
    {
        $window = AdminWindow::fromRequest($request);

        return Inertia::render('admin/dashboard', [
            /*
             * Health comes first in the payload because it comes first on the
             * page. Totals describe how the platform has done; these two
             * describe whether it is working right now, which is the question
             * an operator opens this page holding.
             *
             * Neither is windowed. A ledger either balances or it does not, and
             * a payout stuck since March is not less stuck when the range is
             * set to seven days.
             */
            'integrity' => $health->ledgerIntegrity(),
            'anomalies' => $health->anomalies(),

            'window' => ['value' => $window->key, 'label' => $window->label()],
            'ranges' => AdminWindow::choices(),

            'flows' => $this->flows($window),
            'stocks' => $this->stocks(),
        ]);
    }

    /**
     * Things that happened during the window, each against the period before it.
     *
     * Money is counted by when it settled, not when the invoice was created:
     * a payment raised in March and paid in April belongs to April, because the
     * question "how much came in last week" is about arrival.
     *
     * @return list<array{key: string, label: string, value: int, previous: int, delta: float|null, format: string, hint: string|null, href: string|null}>
     */
    private function flows(AdminWindow $window): array
    {
        $gmv = fn ($q) => $q->where('status', PaymentStatus::Paid->value);

        return [
            $this->flow($window, 'gmv', 'GMV', 'rupiah',
                fn () => Payment::query()->tap($gmv),
                'paid_at',
                'charged_amount',
                'Total pembayaran yang berhasil masuk.',
                route('admin.payments', ['status' => PaymentStatus::Paid->value]),
            ),
            $this->flow($window, 'revenue', 'Pendapatan platform', 'rupiah',
                fn () => WalletLedger::query()->where('type', LedgerType::PlatformFee->value),
                'created_at',
                'amount',
                'Biaya layanan yang terkumpul.',
                null,
            ),
            $this->flow($window, 'payouts', 'Dana dicairkan', 'rupiah',
                fn () => Settlement::query()->where('status', SettlementStatus::Completed->value),
                'processed_at',
                'net_amount',
                'Pencairan yang benar-benar selesai.',
                route('admin.settlements', ['status' => SettlementStatus::Completed->value]),
            ),
            $this->flow($window, 'payments_paid', 'Pembayaran berhasil', 'count',
                fn () => Payment::query()->tap($gmv),
                'paid_at',
                null,
                null,
                route('admin.payments', ['status' => PaymentStatus::Paid->value]),
            ),
            $this->flow($window, 'payments_failed', 'Pembayaran gagal / kedaluwarsa', 'count',
                fn () => Payment::query()->whereIn('status', [
                    PaymentStatus::Failed->value,
                    PaymentStatus::Expired->value,
                ]),
                'created_at',
                null,
                null,
                route('admin.payments', ['status' => PaymentStatus::Expired->value]),
            ),
            $this->flow($window, 'users_new', 'Pengguna baru', 'count',
                fn () => User::query(),
                'created_at',
                null,
                null,
                route('admin.users'),
            ),
            $this->flow($window, 'patungans_new', 'Patungan dibuat', 'count',
                fn () => Patungan::query(),
                'created_at',
                null,
                null,
                route('admin.patungans'),
            ),
        ];
    }

    /**
     * @param  \Closure(): Builder  $base
     * @return array{key: string, label: string, value: int, previous: int, delta: float|null, format: string, hint: string|null, href: string|null}
     */
    private function flow(
        AdminWindow $window,
        string $key,
        string $label,
        string $format,
        \Closure $base,
        string $column,
        // Column to sum, or null to count rows. Named at the call site rather
        // than inferred from the metric key, so adding a metric cannot quietly
        // start summing the wrong column.
        ?string $sumColumn,
        ?string $hint,
        ?string $href,
    ): array {
        $measure = fn ($query) => $sumColumn === null
            ? $query->count()
            : (int) $query->sum($sumColumn);

        $value = $measure($window->scope($base(), $column));
        $previous = $measure($window->scopePrevious($base(), $column));

        return [
            'key' => $key,
            'label' => $label,
            'value' => $value,
            'previous' => $previous,
            'delta' => $window->delta($value, $previous),
            'format' => $format,
            'hint' => $hint,
            'href' => $href,
        ];
    }

    /**
     * Levels as of right now, which is the only way they exist.
     *
     * Deliberately kept apart from the flows above and labelled "saat ini" on
     * the page. Held balance is not a thing that happened during a period, and
     * putting it under a "7 hari" heading would invite somebody to read it as
     * money taken in last week.
     *
     * @return list<array{key: string, label: string, value: int, format: string, hint: string|null, href: string|null}>
     */
    private function stocks(): array
    {
        $credits = (int) WalletLedger::query()->where('direction', LedgerDirection::Credit->value)->sum('amount');
        $debits = (int) WalletLedger::query()->where('direction', LedgerDirection::Debit->value)->sum('amount');

        return [
            [
                'key' => 'balance_held',
                'label' => 'Saldo penyelenggara',
                'value' => $credits - $debits,
                'format' => 'rupiah',
                'hint' => 'Uang yang kami pegang dan belum dicairkan.',
                'href' => null,
            ],
            [
                'key' => 'payouts_pending',
                'label' => 'Pencairan menunggu',
                'value' => Settlement::query()->whereIn('status', [
                    SettlementStatus::Pending->value,
                    SettlementStatus::Processing->value,
                ])->count(),
                'format' => 'count',
                'hint' => null,
                'href' => route('admin.settlements', ['status' => SettlementStatus::Pending->value]),
            ],
            [
                'key' => 'payments_pending',
                'label' => 'Pembayaran berjalan',
                'value' => Payment::query()->where('status', PaymentStatus::Pending->value)->count(),
                'format' => 'count',
                'hint' => null,
                'href' => route('admin.payments', ['status' => PaymentStatus::Pending->value]),
            ],
            [
                'key' => 'patungans_active',
                'label' => 'Patungan aktif',
                'value' => Patungan::query()->where('status', PatunganStatus::Active->value)->count(),
                'format' => 'count',
                'hint' => null,
                'href' => route('admin.patungans', ['status' => PatunganStatus::Active->value]),
            ],
            [
                'key' => 'users_total',
                'label' => 'Total pengguna',
                'value' => User::query()->count(),
                'format' => 'count',
                'hint' => null,
                'href' => route('admin.users'),
            ],
        ];
    }
}
