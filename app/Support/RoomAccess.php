<?php

namespace App\Support;

use App\Models\Patungan;
use App\Models\PatunganParticipant;
use Illuminate\Http\Request;

/**
 * Remembers which participant a visitor unlocked in a private room.
 *
 * The session is the only thing that grants access, so a vendor who knows one
 * PIN can never read another vendor's row by editing a URL.
 */
final class RoomAccess
{
    private const PREFIX = 'room_access.';

    public static function grant(Request $request, PatunganParticipant $participant): void
    {
        $request->session()->put(self::key($participant->patungan_id), $participant->id);
    }

    public static function forget(Request $request, Patungan $patungan): void
    {
        $request->session()->forget(self::key($patungan->id));
    }

    /** The participant this visitor unlocked, or null when the room is still locked. */
    public static function participant(Request $request, Patungan $patungan): ?PatunganParticipant
    {
        $participantId = $request->session()->get(self::key($patungan->id));

        if ($participantId === null) {
            return null;
        }

        return PatunganParticipant::query()
            ->where('patungan_id', $patungan->id)
            ->find($participantId);
    }

    /** Whether this visitor may act on the given participant. */
    public static function allows(Request $request, Patungan $patungan, PatunganParticipant $participant): bool
    {
        if (! $patungan->isPrivateRoom()) {
            return true;
        }

        return self::participant($request, $patungan)?->is($participant) ?? false;
    }

    private static function key(int $patunganId): string
    {
        return self::PREFIX.$patunganId;
    }
}
