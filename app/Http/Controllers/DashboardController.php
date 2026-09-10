<?php

namespace App\Http\Controllers;

use App\Enums\LedgerType;
use App\Enums\ParticipantStatus;
use App\Enums\PatunganStatus;
use App\Enums\PayerZone;
use App\Enums\PaymentStatus;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Models\Payment;
use App\Models\User;
use App\Models\WalletLedger;
use App\Services\LedgerService;
use App\Support\DashboardMetrics;
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
        private readonly DashboardMetrics $metrics,
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
            'metrics' => [
                'collected' => $this->metrics->collected($user),
                'settled' => $this->metrics->settled($user),
                'created' => $this->metrics->created($user),
                'collection' => $this->metrics->collection($user),
                'chase' => $this->metrics->chase($user),
            ],
            'zones' => $this->zones($user),
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

    /**
     * Where the organizer's money actually came from, by time zone.
     *
     * Counts settled payments only - a pending invoice is somebody who opened a
     * QR code, not somebody who paid, and mixing the two would overstate every
     * region that abandons checkout most.
     *
     * `unknown` is reported rather than hidden. Every payment taken before this
     * column existed has no zone, and so does every payer whose browser would
     * not say. Folding those into WIB because it is the biggest bucket would
     * turn a gap in the data into a confident wrong answer.
     *
     * @return array{total: int, known: int, unknown: int, rows: list<array{zone: string, label: string, islands: string, count: int, amount: int, share: float}>}
     */
    private function zones(User $user): array
    {
        $rows = Payment::query()
            ->where('organizer_id', $user->id)
            ->where('status', PaymentStatus::Paid->value)
            ->selectRaw('payer_zone, COUNT(*) as payments, SUM(amount) as amount')
            ->groupBy('payer_zone')
            ->get();

        $total = (int) $rows->sum('payments');
        $unknown = (int) $rows->firstWhere('payer_zone', null)?->payments;
        $known = $total - $unknown;

        $breakdown = [];

        foreach ([...PayerZone::indonesian(), PayerZone::Overseas] as $zone) {
            $row = $rows->firstWhere('payer_zone', $zone->value);
            $count = (int) ($row->payments ?? 0);

            $breakdown[] = [
                'zone' => $zone->value,
                'label' => $zone->label(),
                'islands' => $zone->islands(),
                'count' => $count,
                'amount' => (int) ($row->amount ?? 0),
                // Share of payments we can place, not of all payments. Dividing
                // by the total would shrink every slice by the size of the gap.
                'share' => $known > 0 ? round($count / $known * 100, 1) : 0.0,
            ];
        }

        return ['total' => $total, 'known' => $known, 'unknown' => $unknown, 'rows' => $breakdown];
    }

    /** A fresh query each time, so callers can add to it without clashing. */
    private function ongoing(User $user): Builder
    {
        return Patungan::query()
            ->where('organizer_id', $user->id)
            ->whereIn('status', self::ONGOING);
    }
}
