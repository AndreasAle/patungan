<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreParticipantsRequest;
use App\Http\Requests\UpdateParticipantRequest;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Services\ParticipantService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class ParticipantController extends Controller
{
    public function __construct(private readonly ParticipantService $service) {}

    public function store(StoreParticipantsRequest $request, Patungan $patungan): RedirectResponse
    {
        $this->authorize('manageParticipants', $patungan);

        $this->service->addMany($patungan, $request->validated('participants'));

        return back()->with('success', 'Peserta ditambahkan.');
    }

    public function update(UpdateParticipantRequest $request, Patungan $patungan, PatunganParticipant $participant): RedirectResponse
    {
        $this->authorize('manageParticipants', $patungan);
        $this->assertBelongsTo($patungan, $participant);

        $this->service->update($participant, $request->validated());

        return back()->with('success', 'Peserta diperbarui.');
    }

    public function destroy(Patungan $patungan, PatunganParticipant $participant): RedirectResponse
    {
        $this->authorize('manageParticipants', $patungan);
        $this->assertBelongsTo($patungan, $participant);

        $this->service->remove($participant);

        return back()->with('success', 'Peserta dihapus.');
    }

    public function markPaid(Request $request, Patungan $patungan, PatunganParticipant $participant): RedirectResponse
    {
        $this->authorize('manageParticipants', $patungan);
        $this->assertBelongsTo($patungan, $participant);

        $this->service->markPaidManually($participant, $request->user());

        return back()->with('success', $participant->name.' ditandai sudah bayar.');
    }

    public function unmarkPaid(Patungan $patungan, PatunganParticipant $participant): RedirectResponse
    {
        $this->authorize('manageParticipants', $patungan);
        $this->assertBelongsTo($patungan, $participant);

        $this->service->unmarkManualPayment($participant);

        return back()->with('success', 'Tanda bayar dibatalkan.');
    }

    /** Guards against pairing a participant with someone else's patungan. */
    private function assertBelongsTo(Patungan $patungan, PatunganParticipant $participant): void
    {
        abort_unless($participant->patungan_id === $patungan->id, 404);
    }
}
