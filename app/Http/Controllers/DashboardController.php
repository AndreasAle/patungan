<?php

namespace App\Http\Controllers;

use App\Enums\PatunganStatus;
use App\Models\Patungan;
use App\Services\LedgerService;
use App\Support\PatunganPresenter;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __construct(
        private readonly LedgerService $ledger,
        private readonly PatunganPresenter $presenter,
    ) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $active = Patungan::query()
            ->where('organizer_id', $user->id)
            ->whereIn('status', [PatunganStatus::Active->value, PatunganStatus::Draft->value])
            ->latest()
            ->limit(10)
            ->get();

        $history = Patungan::query()
            ->where('organizer_id', $user->id)
            ->whereIn('status', [
                PatunganStatus::Completed->value,
                PatunganStatus::Closed->value,
                PatunganStatus::Cancelled->value,
            ])
            ->latest()
            ->limit(5)
            ->get();

        return Inertia::render('dashboard', [
            'balance' => [
                'available' => $this->ledger->availableBalance($user),
                'pending' => $this->ledger->pendingBalance($user),
                'paid_out' => $this->ledger->totalPaidOut($user),
            ],
            'active' => $active->map(fn (Patungan $p) => $this->presenter->card($p))->all(),
            'history' => $history->map(fn (Patungan $p) => $this->presenter->card($p))->all(),
            'notifications' => $user->unreadNotifications()->limit(5)->get()
                ->map(fn ($notification) => [
                    'id' => $notification->id,
                    'data' => $notification->data,
                    'created_at' => $notification->created_at->toIso8601String(),
                ])->all(),
        ]);
    }
}
