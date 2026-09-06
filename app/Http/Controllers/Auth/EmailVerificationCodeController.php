<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\EmailVerificationCode;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationCodeController extends Controller
{
    public function __construct(private readonly EmailVerificationCode $codes) {}

    /** The "check your email" screen where the code is typed in. */
    public function show(Request $request): Response|RedirectResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended(route('dashboard'));
        }

        return Inertia::render('auth/verify-email', [
            'email' => $user->email,
            'cooldown' => $this->codes->cooldown($user),
            'minutes' => EmailVerificationCode::TTL_MINUTES,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'code' => ['required', 'string', 'max:12'],
        ]);

        $user = $request->user();
        $result = $this->codes->confirm($user, $request->string('code')->toString());

        if (! $result['ok']) {
            return back()->withErrors(['code' => $result['message']]);
        }

        return redirect()->intended(route('dashboard'))->with('success', 'Email kamu sudah terverifikasi.');
    }

    /** Sends a fresh code, with a short cooldown between requests. */
    public function resend(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->route('dashboard');
        }

        $waitFor = $this->codes->cooldown($user);

        if ($waitFor > 0) {
            return back()->withErrors(['code' => "Tunggu {$waitFor} detik lagi sebelum minta kode baru."]);
        }

        $this->codes->send($user);

        return back()->with('status', 'verification-code-sent');
    }
}
