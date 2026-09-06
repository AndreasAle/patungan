<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\VerifyEmailWithCode;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Issues and checks the six digit code sent at registration.
 *
 * The code is stored hashed, expires, and only tolerates a handful of wrong
 * guesses before it has to be re-sent - six digits is a small space to brute
 * force otherwise.
 */
class EmailVerificationCode
{
    public const TTL_MINUTES = 15;

    public const MAX_ATTEMPTS = 6;

    /** Shortest gap between two sends, so the resend button cannot be spammed. */
    public const RESEND_SECONDS = 60;

    /**
     * Issues a code and mails it.
     *
     * Returns false when the mail could not be handed off, so the caller can
     * say so instead of failing the whole request - the code is already
     * stored, and the user can ask for it again.
     */
    public function send(User $user): bool
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->forceFill([
            'email_verification_code' => Hash::make($code),
            'email_verification_sent_at' => now(),
            'email_verification_expires_at' => now()->addMinutes(self::TTL_MINUTES),
            'email_verification_attempts' => 0,
        ])->save();

        try {
            $user->notify(new VerifyEmailWithCode($code));
        } catch (Throwable $e) {
            Log::error('Could not send the verification code', [
                'user' => $user->id,
                'error' => $e->getMessage(),
            ]);

            return false;
        }

        return true;
    }

    /** Seconds left before another code may be sent, or zero when it is allowed. */
    public function cooldown(User $user): int
    {
        $sentAt = $user->email_verification_sent_at;

        if ($sentAt === null) {
            return 0;
        }

        return max(0, self::RESEND_SECONDS - (int) $sentAt->diffInSeconds(now()));
    }

    /**
     * Checks a submitted code and marks the address verified when it matches.
     *
     * @return array{ok: bool, message: ?string}
     */
    public function confirm(User $user, string $submitted): array
    {
        if ($user->hasVerifiedEmail()) {
            return ['ok' => true, 'message' => null];
        }

        if ($user->email_verification_code === null || $user->email_verification_expires_at === null) {
            return ['ok' => false, 'message' => 'Kodenya belum ada. Kirim ulang dulu ya.'];
        }

        if ($user->email_verification_expires_at->isPast()) {
            return ['ok' => false, 'message' => 'Kodenya sudah kedaluwarsa. Minta kode baru ya.'];
        }

        if ($user->email_verification_attempts >= self::MAX_ATTEMPTS) {
            return ['ok' => false, 'message' => 'Sudah terlalu banyak percobaan. Minta kode baru ya.'];
        }

        $code = preg_replace('/\D/', '', $submitted) ?? '';

        if (! Hash::check($code, $user->email_verification_code)) {
            $user->increment('email_verification_attempts');

            $left = max(0, self::MAX_ATTEMPTS - $user->email_verification_attempts);

            return ['ok' => false, 'message' => "Kodenya tidak cocok. Sisa {$left} percobaan."];
        }

        $user->forceFill([
            'email_verified_at' => now(),
            'email_verification_code' => null,
            'email_verification_expires_at' => null,
            'email_verification_attempts' => 0,
        ])->save();

        return ['ok' => true, 'message' => null];
    }
}
