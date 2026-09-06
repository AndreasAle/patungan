<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

/**
 * Sign in with Google.
 *
 * The credentials live in config/services.php and are read from the
 * environment. Until they are filled in, Google::enabled() reports false and
 * the buttons stay hidden, so a half-configured install cannot dead-end a user.
 */
class GoogleAuthController extends Controller
{
    public static function enabled(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    public function redirect(): RedirectResponse
    {
        abort_unless(self::enabled(), 404);

        return Socialite::driver('google')->redirect();
    }

    public function callback(): RedirectResponse
    {
        abort_unless(self::enabled(), 404);

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable $e) {
            Log::warning('Google sign-in failed', ['error' => $e->getMessage()]);

            return redirect()->route('login')->withErrors([
                'email' => 'Login dengan Google gagal. Coba lagi ya.',
            ]);
        }

        $email = $googleUser->getEmail();

        if (blank($email)) {
            return redirect()->route('login')->withErrors([
                'email' => 'Akun Google kamu tidak punya email yang bisa dipakai.',
            ]);
        }

        $user = $this->resolveUser($googleUser->getId(), $email, $googleUser->getName(), $googleUser->getAvatar());

        if ($user->isSuspended()) {
            return redirect()->route('login')->withErrors([
                'email' => 'Akun kamu sedang dibekukan. Hubungi dukungan Patungan.',
            ]);
        }

        Auth::login($user, remember: true);
        request()->session()->regenerate();

        return redirect()->intended(route('dashboard'));
    }

    /**
     * Finds the account this Google identity belongs to, linking it to an
     * existing email when there is one, and creating it otherwise.
     */
    private function resolveUser(string $googleId, string $email, ?string $name, ?string $avatar): User
    {
        return DB::transaction(function () use ($googleId, $email, $name, $avatar): User {
            $user = User::query()->where('google_id', $googleId)->first()
                ?? User::query()->where('email', $email)->lockForUpdate()->first();

            if ($user === null) {
                $user = new User;
                $user->forceFill([
                    'name' => $name ?: Str::before($email, '@'),
                    'email' => $email,
                    // No password: this account signs in through Google only.
                    'password' => null,
                ]);
            }

            $user->forceFill([
                'google_id' => $googleId,
                'avatar_url' => $avatar,
                // Google has already verified the address for us.
                'email_verified_at' => $user->email_verified_at ?? now(),
            ])->save();

            return $user;
        });
    }
}
