<?php

namespace App\Services;

use App\Models\User;
use App\Otp\OtpSenderManager;
use App\Support\PhoneNumber;
use Illuminate\Support\Facades\Hash;

/**
 * Issues and checks the code that proves an organizer owns a phone number.
 *
 * The same shape as EmailVerificationCode on purpose - hashed code, expiry,
 * attempt ceiling, resend cooldown - so there is one pattern here rather than
 * two that drift apart.
 *
 * What it is for is narrower than "verifying a phone". PayoutRiskPolicy holds
 * automatic payouts until this passes, because an alert about a new payout
 * account has to reach somebody through a channel an attacker inside the email
 * does not already control.
 */
class PhoneVerificationCode
{
    public const TTL_MINUTES = 10;

    public const MAX_ATTEMPTS = 5;

    public const RESEND_SECONDS = 60;

    public function __construct(private readonly OtpSenderManager $senders) {}

    public function isAvailable(): bool
    {
        return $this->senders->driver()->isAvailable();
    }

    /**
     * Issues a code for a number and sends it.
     *
     * The number is stored normalised and left unverified until the code comes
     * back. Writing it now means a person who abandons the flow still sees the
     * number they entered rather than a blank field.
     *
     * @return array{ok: bool, message: ?string}
     */
    public function send(User $user, string $phone): array
    {
        $normalised = PhoneNumber::normalise($phone);

        if ($normalised === null) {
            return ['ok' => false, 'message' => 'Nomornya belum benar. Contoh: 0812 3456 7890.'];
        }

        if (! $this->isAvailable()) {
            return ['ok' => false, 'message' => 'Verifikasi nomor HP sedang tidak tersedia.'];
        }

        if (($wait = $this->cooldown($user)) > 0) {
            return ['ok' => false, 'message' => "Tunggu {$wait} detik sebelum minta kode lagi."];
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $user->forceFill([
            'phone' => $normalised,
            /*
             * Cleared whenever a new number is entered. A number verified last
             * month must not keep vouching for a number typed today - that
             * would be the exact hole this is here to close.
             */
            'phone_verified_at' => $user->phone === $normalised ? $user->phone_verified_at : null,
            'phone_verification_code' => Hash::make($code),
            'phone_verification_sent_at' => now(),
            'phone_verification_expires_at' => now()->addMinutes(self::TTL_MINUTES),
            'phone_verification_attempts' => 0,
        ])->save();

        $sent = $this->senders->driver()->send(
            $normalised,
            'Kode verifikasi Patungan kamu: '.$code.'. Berlaku '.self::TTL_MINUTES.' menit. Jangan bagikan ke siapa pun.',
        );

        return $sent
            ? ['ok' => true, 'message' => null]
            : ['ok' => false, 'message' => 'Kodenya gagal dikirim. Coba lagi sebentar lagi.'];
    }

    /** Seconds left before another code may be sent, or zero when it is allowed. */
    public function cooldown(User $user): int
    {
        $sentAt = $user->phone_verification_sent_at;

        if ($sentAt === null) {
            return 0;
        }

        return max(0, self::RESEND_SECONDS - (int) $sentAt->diffInSeconds(now()));
    }

    /**
     * @return array{ok: bool, message: ?string}
     */
    public function confirm(User $user, string $submitted): array
    {
        if ($user->phone_verification_code === null || $user->phone_verification_expires_at === null) {
            return ['ok' => false, 'message' => 'Kodenya belum ada. Kirim ulang dulu ya.'];
        }

        if ($user->phone_verification_expires_at->isPast()) {
            return ['ok' => false, 'message' => 'Kodenya sudah kedaluwarsa. Minta kode baru ya.'];
        }

        if ($user->phone_verification_attempts >= self::MAX_ATTEMPTS) {
            return ['ok' => false, 'message' => 'Sudah terlalu banyak percobaan. Minta kode baru ya.'];
        }

        $code = preg_replace('/\D/', '', $submitted) ?? '';

        if (! Hash::check($code, $user->phone_verification_code)) {
            $user->increment('phone_verification_attempts');

            $left = max(0, self::MAX_ATTEMPTS - $user->phone_verification_attempts);

            return ['ok' => false, 'message' => "Kodenya tidak cocok. Sisa {$left} percobaan."];
        }

        $user->forceFill([
            'phone_verified_at' => now(),
            'phone_verification_code' => null,
            'phone_verification_expires_at' => null,
            'phone_verification_attempts' => 0,
        ])->save();

        return ['ok' => true, 'message' => null];
    }
}
