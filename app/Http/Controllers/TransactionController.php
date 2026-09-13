<?php

namespace App\Http\Controllers;

use App\Enums\LedgerDirection;
use App\Models\WalletLedger;
use App\Services\LedgerService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function __construct(private readonly LedgerService $ledger) {}

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $filter = in_array($request->string('direction')->toString(), ['credit', 'debit'], true)
            ? $request->string('direction')->toString()
            : 'all';

        $entries = WalletLedger::query()
            ->where('user_id', $user->id)
            ->when($filter === 'credit', fn ($query) => $query->where('direction', LedgerDirection::Credit->value))
            ->when($filter === 'debit', fn ($query) => $query->where('direction', LedgerDirection::Debit->value))
            ->with(['patungan:id,uuid,title'])
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        $totals = WalletLedger::query()
            ->where('user_id', $user->id)
            ->selectRaw('direction, COALESCE(SUM(amount), 0) as total')
            ->groupBy('direction')
            ->pluck('total', 'direction');

        return Inertia::render('transaksi', [
            'summary' => [
                'balance' => $this->ledger->availableBalance($user),
                'incoming' => (int) ($totals[LedgerDirection::Credit->value] ?? 0),
                'outgoing' => (int) ($totals[LedgerDirection::Debit->value] ?? 0),
            ],
            'filter' => $filter,
            'entries' => [
                'data' => collect($entries->items())->map(fn (WalletLedger $entry) => [
                    'uuid' => $entry->uuid,
                    'type' => $entry->type->value,
                    'type_label' => $entry->type->label(),
                    'direction' => $entry->direction->value,
                    'amount' => $entry->amount,
                    'balance_after' => $entry->balance_after,
                    'description' => $entry->description,
                    'patungan_title' => $entry->patungan?->title,
                    'created_at' => $entry->created_at?->toIso8601String(),
                ])->all(),
                'current_page' => $entries->currentPage(),
                'last_page' => $entries->lastPage(),
                'total' => $entries->total(),
            ],
        ]);
    }
}
