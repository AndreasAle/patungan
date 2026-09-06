<?php

namespace App\Http\Controllers\Admin;

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
use App\Models\WebhookLog;
use Inertia\Inertia;
use Inertia\Response;

class AdminDashboardController extends Controller
{
    public function __invoke(): Response
    {
        $paymentCounts = Payment::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return Inertia::render('admin/dashboard', [
            'stats' => [
                'users' => User::query()->count(),
                'patungans' => Patungan::query()->count(),
                'patungans_active' => Patungan::query()->where('status', PatunganStatus::Active->value)->count(),
                // GMV counts money that actually settled.
                'gmv' => (int) Payment::query()->paid()->sum('charged_amount'),
                'payments_paid' => (int) ($paymentCounts[PaymentStatus::Paid->value] ?? 0),
                'payments_pending' => (int) ($paymentCounts[PaymentStatus::Pending->value] ?? 0),
                'payments_failed' => (int) ($paymentCounts[PaymentStatus::Failed->value] ?? 0)
                    + (int) ($paymentCounts[PaymentStatus::Expired->value] ?? 0),
                'platform_revenue' => (int) WalletLedger::query()
                    ->where('type', LedgerType::PlatformFee->value)
                    ->sum('amount'),
                'payouts_pending' => Settlement::query()
                    ->whereIn('status', [SettlementStatus::Pending->value, SettlementStatus::Processing->value])
                    ->count(),
                'payouts_amount' => (int) Settlement::query()
                    ->where('status', SettlementStatus::Completed->value)
                    ->sum('net_amount'),
                'webhook_failures' => WebhookLog::query()
                    ->whereIn('status', [WebhookLog::STATUS_FAILED, WebhookLog::STATUS_REJECTED])
                    ->count(),
            ],
        ]);
    }
}
