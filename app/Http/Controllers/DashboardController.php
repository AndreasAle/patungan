<?php

namespace App\Http\Controllers;

use App\Enums\LedgerType;
use App\Enums\ParticipantStatus;
use App\Enums\PatunganStatus;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Models\User;
use App\Models\WalletLedger;
use App\Services\LedgerService;
use App\Support\PatunganPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /** Patungan that are still collecting money, as opposed to the archive. */
    private const ONGOING = [PatunganStatus::Active->value, PatunganStatus::Draft->value];

    public function __construct(
        private readonly LedgerService $ledger,
        private readonly PatunganPresenter $presenter,
    ) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $active = $this->ongoing($user)->latest()->limit(10)->get();

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
            'stats' => $this->stats($user),
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

    /**
     * The three numbers an organizer actually acts on: how many patungan are
     * running, how many people still owe, and what came in this month.
     *
     * These count everything the organizer owns, not just the rows shown on
     * the page, so the summary does not quietly stop at the tenth patungan.
     *
     * @return array{active_count: int, awaiting_count: int, collected_this_month: int}
     */
    private function stats(User $user): array
    {
        return [
            'active_count' => $this->ongoing($user)->count(),

            'awaiting_count' => PatunganParticipant::query()
                ->whereIn('patungan_id', $this->ongoing($user)->select('id'))
                ->whereIn('status', [ParticipantStatus::Unpaid->value, ParticipantStatus::Pending->value])
                ->count(),

            'collected_this_month' => (int) WalletLedger::query()
                ->where('user_id', $user->id)
                ->where('type', LedgerType::PaymentReceived->value)
                ->where('created_at', '>=', now()->startOfMonth())
                ->sum('amount'),
        ];
    }

    /** A fresh query each time, so callers can add to it without clashing. */
    private function ongoing(User $user): Builder
    {
        return Patungan::query()
            ->where('organizer_id', $user->id)
            ->whereIn('status', self::ONGOING);
    }
}
