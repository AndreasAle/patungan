<?php

namespace App\Http\Controllers\Admin;

use App\Enums\PatunganStatus;
use App\Http\Controllers\Controller;
use App\Models\Patungan;
use App\Services\PatunganService;
use App\Support\AdminAudit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminPatunganController extends Controller
{
    public function __construct(private readonly PatunganService $service) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();

        $patungans = Patungan::query()
            ->with('organizer:id,name,email')
            ->when($search !== '', fn ($query) => $query->where('title', 'like', "%{$search}%"))
            ->when($status !== '', fn ($query) => $query->where('status', $status))
            ->latest('id')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('admin/patungans', [
            'filters' => ['search' => $search, 'status' => $status],
            'statuses' => array_map(fn (PatunganStatus $s) => ['value' => $s->value, 'label' => $s->label()], PatunganStatus::cases()),
            'patungans' => [
                'data' => collect($patungans->items())->map(fn (Patungan $patungan) => [
                    'uuid' => $patungan->uuid,
                    'title' => $patungan->title,
                    'organizer' => $patungan->organizer->name,
                    'status' => $patungan->status->value,
                    'status_label' => $patungan->status->label(),
                    'target_amount' => $patungan->target_amount,
                    'collected_amount' => $patungan->collected_amount,
                    'participant_count' => $patungan->participant_count,
                    'paid_participant_count' => $patungan->paid_participant_count,
                    'created_at' => $patungan->created_at?->toIso8601String(),
                ])->all(),
                'current_page' => $patungans->currentPage(),
                'last_page' => $patungans->lastPage(),
                'total' => $patungans->total(),
            ],
        ]);
    }

    public function updateStatus(Request $request, Patungan $patungan): RedirectResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in([PatunganStatus::Closed->value, PatunganStatus::Active->value])],
        ]);

        $before = $patungan->status->value;

        $validated['status'] === PatunganStatus::Closed->value
            ? $this->service->close($patungan)
            : $this->service->reopen($patungan);

        AdminAudit::record(
            $request->user(),
            AdminAudit::PATUNGAN_STATUS_CHANGED,
            $patungan,
            $patungan->title,
            ['from' => $before, 'to' => $validated['status']],
            $request->ip(),
        );

        return back()->with('success', 'Status patungan diperbarui.');
    }
}
