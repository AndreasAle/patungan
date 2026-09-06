<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Patungan;
use App\Services\RoomPinService;
use App\Support\RoomAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/** Unlocks a private room with the PIN the organizer handed to one participant. */
class RoomAccessController extends Controller
{
    public function __construct(private readonly RoomPinService $pins) {}

    public function unlock(Request $request, string $token): RedirectResponse
    {
        $request->validate([
            'pin' => ['required', 'string', 'max:12'],
        ]);

        $patungan = Patungan::query()->where('public_token', $token)->firstOrFail();

        abort_unless($patungan->isPrivateRoom(), 404);

        $participant = $this->pins->resolve($patungan, $request->string('pin')->toString());

        if ($participant === null) {
            Log::info('Rejected private room PIN', ['patungan' => $patungan->uuid]);

            return back()->withErrors(['pin' => 'PIN tidak cocok. Cek lagi pesan dari penyelenggara.']);
        }

        RoomAccess::grant($request, $participant);

        return redirect()->route('public.patungan.show', $token);
    }

    public function lock(Request $request, string $token): RedirectResponse
    {
        $patungan = Patungan::query()->where('public_token', $token)->firstOrFail();

        RoomAccess::forget($request, $patungan);

        return redirect()->route('public.patungan.show', $token);
    }
}
