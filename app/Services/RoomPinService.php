<?php

namespace App\Services;

use App\Models\Patungan;
use App\Models\PatunganParticipant;
use RuntimeException;

/**
 * Issues and checks the per-participant PIN that unlocks a private room.
 *
 * The PIN is stored encrypted so the organizer can read it back to pass it on,
 * plus a keyed lookup hash so a submitted PIN can be matched without decrypting
 * every row - and so two participants in one room can never share a PIN.
 */
class RoomPinService
{
    private const LENGTH = 6;

    public function generateFor(Patungan $patungan): string
    {
        for ($attempt = 0; $attempt < 20; $attempt++) {
            $pin = str_pad((string) random_int(0, 999999), self::LENGTH, '0', STR_PAD_LEFT);

            $taken = PatunganParticipant::query()
                ->where('patungan_id', $patungan->id)
                ->where('access_pin_lookup', $this->lookup($patungan, $pin))
                ->exists();

            if (! $taken) {
                return $pin;
            }
        }

        throw new RuntimeException('Could not allocate a unique room PIN.');
    }

    /** Assigns a fresh PIN to a participant that does not have one yet. */
    public function assign(PatunganParticipant $participant, Patungan $patungan): void
    {
        if ($participant->access_pin !== null) {
            return;
        }

        $pin = $this->generateFor($patungan);

        $participant->forceFill([
            'access_pin' => $pin,
            'access_pin_lookup' => $this->lookup($patungan, $pin),
        ]);
    }

    /** Clears a room PIN, e.g. when a patungan is switched back to an open link. */
    public function revoke(PatunganParticipant $participant): void
    {
        $participant->forceFill(['access_pin' => null, 'access_pin_lookup' => null]);
    }

    /** Returns the participant that PIN belongs to, or null. */
    public function resolve(Patungan $patungan, string $pin): ?PatunganParticipant
    {
        $pin = preg_replace('/\D/', '', $pin) ?? '';

        if (strlen($pin) !== self::LENGTH) {
            return null;
        }

        return PatunganParticipant::query()
            ->where('patungan_id', $patungan->id)
            ->where('access_pin_lookup', $this->lookup($patungan, $pin))
            ->first();
    }

    /**
     * Keyed hash of the PIN, scoped to the patungan so the same digits in two
     * different rooms never collide.
     */
    private function lookup(Patungan $patungan, string $pin): string
    {
        return hash_hmac('sha256', $patungan->uuid.'|'.$pin, (string) config('app.key'));
    }
}
