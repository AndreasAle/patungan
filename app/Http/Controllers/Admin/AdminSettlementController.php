<?php

namespace App\Http\Controllers\Admin;

use App\Enums\SettlementStatus;
use App\Http\Controllers\Controller;
use App\Models\Settlement;
use App\Services\SettlementService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminSettlementController extends Controller
{
    public function __construct(private readonly SettlementService $settlements) {}

    public function index(Request $request): Response
    {
        $status = $request->string('status')->toString();

        $settlements = Settlement::query()
            ->with('organizer:id,name,email')
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->latest('requested_at')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('admin/settlements', [
            'filters' => ['status' => $status],
            'statuses' => array_map(fn (SettlementStatus $s) => ['value' => $s->value, 'label' => $s->label()], SettlementStatus::cases()),
            'provider' => [
                'name' => $this->settlements->providerName(),
                'automated' => $this->settlements->providerIsAutomated(),
            ],
            'settlements' => [
                'data' => collect($settlements->items())->map(fn (Settlement $settlement) => [
                    'uuid' => $settlement->uuid,
                    'organizer' => $settlement->organizer->name,
                    'amount' => $settlement->amount,
                    'net_amount' => $settlement->net_amount,
                    'destination' => $settlement->destination_account_reference,
                    'holder' => $settlement->destination_holder_name,
                    'status' => $settlement->status->value,
                    'status_label' => $settlement->status->label(),
                    'provider_reference' => $settlement->provider_reference,
                    'requested_at' => $settlement->requested_at?->toIso8601String(),
                    'processed_at' => $settlement->processed_at?->toIso8601String(),
                    'failure_reason' => $settlement->failure_reason,
                ])->all(),
                'current_page' => $settlements->currentPage(),
                'last_page' => $settlements->lastPage(),
                'total' => $settlements->total(),
            ],
        ]);
    }

    public function update(Request $request, Settlement $settlement): RedirectResponse
    {
        $this->authorize('process', $settlement);

        $validated = $request->validate([
            'action' => ['required', Rule::in(['processing', 'complete', 'fail', 'reject'])],
            'provider_reference' => ['nullable', 'string', 'max:100'],
            'reason' => ['required_if:action,fail,reject', 'nullable', 'string', 'max:255'],
        ]);

        $actor = $request->user();

        match ($validated['action']) {
            'processing' => $this->settlements->markProcessing($settlement, $actor),
            'complete' => $this->settlements->markCompleted($settlement, $actor, $validated['provider_reference'] ?? null),
            'fail' => $this->settlements->markFailed($settlement, $actor, SettlementStatus::Failed, $validated['reason']),
            'reject' => $this->settlements->markFailed($settlement, $actor, SettlementStatus::Rejected, $validated['reason']),
        };

        return back()->with('success', 'Status pencairan diperbarui.');
    }
}
