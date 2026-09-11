<?php

namespace App\Http\Controllers;

use App\Enums\AccountVerificationStatus;
use App\Http\Requests\StorePayoutDestinationRequest;
use App\Models\PayoutDestination;
use App\Payouts\AccountVerifier;
use App\Support\PayoutChannels;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PayoutDestinationController extends Controller
{
    public function __construct(private readonly AccountVerifier $verifier) {}

    /**
     * Asks the bank who owns an account number.
     *
     * Throttled hard. Account numbers are short and sequential enough that an
     * unlimited inquiry endpoint is a way to harvest names from a bank, so
     * this is rate limited in the route and scoped to a signed-in organizer.
     */
    public function verify(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'max:20'],
            'provider_code' => ['required', 'string', 'max:40'],
            'account_number' => ['required', 'string', 'max:40'],
        ]);

        $channel = PayoutChannels::find($validated['type'], $validated['provider_code']);

        abort_if($channel === null, 422);

        $outcome = $this->verifier->verify($request->user(), $channel['code'], $validated['account_number']);

        return response()->json([
            'status' => $outcome['status']->value,
            'status_label' => $outcome['status']->label(),
            'account_holder' => $outcome['account_holder'],
            'found' => $outcome['found'],
            'message' => $outcome['message'],
        ]);
    }

    public function index(Request $request): Response
    {
        $destinations = $request->user()->payoutDestinations()->latest()->get();

        return Inertia::render('payout-destinations', [
            'channels' => PayoutChannels::all(),
            'destinations' => $destinations->map(fn (PayoutDestination $destination) => [
                'id' => $destination->id,
                'type' => $destination->type->value,
                'label' => $destination->maskedLabel(),
                'account_holder' => $destination->account_holder,
                'verification_status' => $destination->verification_status->value,
                'verification_label' => $destination->verification_status->label(),
                'verified_account_holder' => $destination->verified_account_holder,
                'is_default' => $destination->is_default,
            ])->all(),
            'inquiry_available' => $this->verifier->isAvailable(),
        ]);
    }

    public function store(StorePayoutDestinationRequest $request): RedirectResponse
    {
        $channel = PayoutChannels::find($request->string('type')->toString(), $request->string('provider_code')->toString());

        abort_if($channel === null, 422);

        DB::transaction(function () use ($request, $channel): void {
            $user = $request->user();
            $isFirst = ! $user->payoutDestinations()->exists();

            /*
             * Verified again here, server side, and never from what the browser
             * claims. The page runs the same check to show a name before
             * saving, but a request can be replayed with any status attached -
             * so the stored verdict is the one this server reached itself.
             */
            $outcome = $this->verifier->verify($user, $channel['code'], $request->string('account_number')->toString());

            $destination = $user->payoutDestinations()->create([
                'type' => $request->string('type')->toString(),
                'provider_code' => $channel['code'],
                'provider_label' => $channel['label'],
                'account_number' => $request->string('account_number')->toString(),
                // The bank's answer wins over what was typed, when there is one.
                'account_holder' => $outcome['account_holder'] ?? $request->string('account_holder')->toString(),
                'is_default' => $isFirst,
            ]);

            $destination->forceFill([
                'verification_status' => $outcome['status']->value,
                'verified_account_holder' => $outcome['account_holder'],
                'verified_at' => $outcome['status'] === AccountVerificationStatus::Verified ? now() : null,
            ])->save();
        });

        return back()->with('success', 'Rekening tujuan ditambahkan.');
    }

    public function makeDefault(Request $request, PayoutDestination $destination): RedirectResponse
    {
        abort_unless($destination->user_id === $request->user()->id, 403);

        DB::transaction(function () use ($request, $destination): void {
            $request->user()->payoutDestinations()->update(['is_default' => false]);
            $destination->forceFill(['is_default' => true])->save();
        });

        return back()->with('success', 'Rekening utama diperbarui.');
    }

    public function destroy(Request $request, PayoutDestination $destination): RedirectResponse
    {
        abort_unless($destination->user_id === $request->user()->id, 403);

        $destination->delete();

        return back()->with('success', 'Rekening tujuan dihapus.');
    }
}
