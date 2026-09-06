<?php

namespace App\Http\Controllers;

use App\Models\WalletLedger;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $entries = WalletLedger::query()
            ->where('user_id', $request->user()->id)
            ->with(['patungan:id,uuid,title'])
            ->latest('id')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('transaksi', [
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
