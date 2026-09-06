<?php

namespace App\Http\Controllers;

use App\Enums\PatunganCategory;
use App\Enums\SplitType;
use App\Http\Requests\StorePatunganRequest;
use App\Http\Requests\UpdatePatunganRequest;
use App\Models\Patungan;
use App\Services\FeeCalculator;
use App\Services\PatunganService;
use App\Support\Money;
use App\Support\PatunganPresenter;
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

        return redirect()
            ->route('patungan.show', $patungan)
            ->with('success', 'Patungan berhasil dibuat. Tinggal bagikan linknya!');
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
            ],
            'share_message' => $this->shareMessage($patungan),
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

    private function shareMessage(Patungan $patungan): string
    {
        $amount = $patungan->split_type === SplitType::Equal && $patungan->equal_amount
            ? 'Patungan '.Money::format($patungan->equal_amount).'/orang.'
            : 'Nominal tiap orang beda-beda, cek di link ya.';

        return implode("\n", [
            $patungan->title,
            $amount,
            '',
            'Bayarnya lewat link ini ya:',
            $patungan->publicUrl(),
            '',
            'Tinggal buka link, pilih nama kamu, bayar QRIS. Nggak perlu login.',
        ]);
    }
}
