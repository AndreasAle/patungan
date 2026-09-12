<?php

namespace App\Http\Controllers;

use App\Services\PhoneVerificationCode;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Verifying an organizer's phone number.
 *
 * Lives beside the payout screens rather than in account settings, because that
 * is where it earns its keep: a verified phone is one of the conditions
 * PayoutRiskPolicy requires before money leaves without a human, and the moment
 * somebody is arranging a payout is the moment the reason for it is obvious.
 */
class PhoneVerificationController extends Controller
{
    public function __construct(private readonly PhoneVerificationCode $codes) {}

    public function send(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
        ]);

        $result = $this->codes->send($request->user(), $validated['phone']);

        if (! $result['ok']) {
            // Thrown as validation so it lands on the field the person is
            // looking at, rather than as a banner they have to go hunting for.
            throw ValidationException::withMessages(['phone' => $result['message']]);
        }

        return back()->with('success', 'Kode verifikasi sudah dikirim.');
    }

    public function confirm(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'max:10'],
        ]);

        $result = $this->codes->confirm($request->user(), $validated['code']);

        if (! $result['ok']) {
            throw ValidationException::withMessages(['code' => $result['message']]);
        }

        return back()->with('success', 'Nomor HP kamu sudah terverifikasi.');
    }
}
