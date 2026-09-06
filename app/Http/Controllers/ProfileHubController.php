<?php

namespace App\Http\Controllers;

use App\Enums\PatunganStatus;
use App\Models\Patungan;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** The account home: who you are, what you've collected, and where to go next. */
class ProfileHubController extends Controller
{
    public function __construct(private readonly LedgerService $ledger) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $totals = Patungan::query()
            ->where('organizer_id', $user->id)
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('COALESCE(SUM(collected_amount), 0) as collected')
            ->selectRaw('SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed', [PatunganStatus::Completed->value])
            ->first();

        return Inertia::render('profil', [
            'stats' => [
                'patungans' => (int) $totals->total,
                'collected' => (int) $totals->collected,
                'completed' => (int) $totals->completed,
            ],
            'balance' => [
                'available' => $this->ledger->availableBalance($user),
                'pending' => $this->ledger->pendingBalance($user),
                'paid_out' => $this->ledger->totalPaidOut($user),
            ],
        ]);
    }
}
