<?php

namespace App\Http\Controllers;

use App\Enums\PatunganCategory;
use App\Http\Requests\StorePatunganRequest;
use App\Http\Requests\UpdatePatunganRequest;
use App\Models\Patungan;
use App\Services\Analytics;
use App\Services\FeeCalculator;
use App\Services\PatunganService;
use App\Support\PatunganPresenter;
use App\Support\PatunganShareService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatunganController extends Controller
{
    public function __construct(
        private readonly PatunganService $service,
        private readonly PatunganPresenter $presenter,
        private readonly FeeCalculator $fees,
        private readonly PatunganShareService $share,
        private readonly Analytics $analytics,
    ) {}

    public function index(Request $request): Response
    {
        $patungans = Patungan::query()
            ->where('organizer_id', $request->user()->id)
            ->latest()
            ->paginate(15)
            ->withQueryString();

        return Inertia::render('patungan/index', [
            'patungans' => [
                'data' => collect($patungans->items())->map(fn (Patungan $p) => $this->presenter->card($p))->all(),
                'current_page' => $patungans->currentPage(),
                'last_page' => $patungans->lastPage(),
                'total' => $patungans->total(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('patungan/create', [
            'categories' => $this->categories(),
            'limits' => config('patungan.limits'),
            'fee_bearer' => $this->fees->bearer(),
        ]);
    }

    public function store(StorePatunganRequest $request): RedirectResponse
    {
        $patungan = $this->service->create($request->user(), $request->validated());

        /*
         * Straight to the share screen, not the detail page. The next thing an
         * organizer needs to do is put the link in a WhatsApp group; the
         * administrative view is where they go later, if a problem comes up.
         */
        return redirect()->route('patungan.created', $patungan);
    }

    /**
     * The screen between creating a patungan and sharing it.
     *
     * Deliberately almost empty: one headline figure and one dominant button.
     */
    public function created(Request $request, Patungan $patungan): Response
    {
        $this->authorize('view', $patungan);

        $patungan->loadMissing('participants');

        return Inertia::render('patungan/created', [
            'patungan' => [
                'uuid' => $patungan->uuid,
                'title' => $patungan->title,
                'category' => $patungan->category->value,
                'category_label' => $patungan->category->label(),
                'participant_count' => (int) $patungan->participant_count,
                'equal_amount' => $patungan->equal_amount,
                'target_amount' => (int) $patungan->target_amount,
                'split_type' => $patungan->split_type->value,
            ],
            'share' => [
                'public_url' => $this->share->publicUrl($patungan),
                'invite' => $this->share->groupInvite($patungan),
            ],
        ]);
    }

    /**
     * Creates this week's patungan from last week's.
     *
     * Only for one that is finished. Repeating a live patungan would leave two
     * links collecting for the same thing, and the group would have no way to
     * tell which one to use.
     */
    public function repeat(Request $request, Patungan $patungan): RedirectResponse
    {
        $this->authorize('view', $patungan);

        if ($patungan->status->acceptsPayment()) {
            return back()->with('error', 'Patungan ini masih jalan. Tutup dulu sebelum bikin yang baru.');
        }

        $fresh = $this->service->repeat($patungan);

        $this->analytics->record(
            Analytics::PATUNGAN_REPEATED,
            ['from' => $patungan->uuid],
            userId: $request->user()->id,
            patunganId: $fresh->id,
        );

        return redirect()->route('patungan.created', $fresh);
    }

    public function show(Request $request, Patungan $patungan): Response
    {
        $this->authorize('view', $patungan);

        $patungan->load(['participants', 'organizer']);

        return Inertia::render('patungan/show', [
            'patungan' => $this->presenter->organizerDetail($patungan),
            'can' => [
                'manage' => $request->user()->can('manageParticipants', $patungan),
                'close' => $request->user()->can('close', $patungan),
                'delete' => $request->user()->can('delete', $patungan),
            ],
            'share' => [
                'public_url' => $this->share->publicUrl($patungan),
                'invite' => $this->share->groupInvite($patungan),
                'progress' => $this->share->progress($patungan),
                // Null when everybody has paid, so the button can say so
                // instead of composing a reminder addressed to nobody.
                'reminder' => $this->share->unpaidReminder($patungan),
                'remindable' => $this->share->remindable($patungan)
                    ->map(fn ($participant) => $participant->uuid)
                    ->all(),
            ],
            'organizer_name' => $patungan->organizer->name,
        ]);
    }

    public function edit(Patungan $patungan): Response
    {
        $this->authorize('update', $patungan);

        return Inertia::render('patungan/edit', [
            'patungan' => $this->presenter->organizerDetail($patungan->load('participants')),
            'categories' => $this->categories(),
        ]);
    }

    public function update(UpdatePatunganRequest $request, Patungan $patungan): RedirectResponse
    {
        $this->authorize('update', $patungan);

        $this->service->update($patungan, $request->validated());

        return redirect()
            ->route('patungan.show', $patungan)
            ->with('success', 'Patungan berhasil diperbarui.');
    }

    public function destroy(Patungan $patungan): RedirectResponse
    {
        $this->authorize('delete', $patungan);

        $patungan->delete();

        return redirect()
            ->route('patungan.index')
            ->with('success', 'Patungan berhasil dihapus.');
    }

    public function close(Patungan $patungan): RedirectResponse
    {
        $this->authorize('close', $patungan);

        $this->service->close($patungan);

        return back()->with('success', 'Patungan ditutup. Peserta tidak bisa bayar lagi.');
    }

    public function reopen(Patungan $patungan): RedirectResponse
    {
        $this->authorize('close', $patungan);

        $this->service->reopen($patungan);

        return back()->with('success', 'Patungan dibuka lagi.');
    }

    /** @return array<int, array{value: string, label: string}> */
    private function categories(): array
    {
        return array_map(
            fn (PatunganCategory $category) => ['value' => $category->value, 'label' => $category->label()],
            PatunganCategory::cases(),
        );
    }
}
