<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePayoutDestinationRequest;
use App\Models\PayoutDestination;
use App\Support\PayoutChannels;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PayoutDestinationController extends Controller
{
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
                'is_default' => $destination->is_default,
            ])->all(),
        ]);
    }

    public function store(StorePayoutDestinationRequest $request): RedirectResponse
    {
        $channel = PayoutChannels::find($request->string('type')->toString(), $request->string('provider_code')->toString());

        abort_if($channel === null, 422);

        DB::transaction(function () use ($request, $channel): void {
            $user = $request->user();
            $isFirst = ! $user->payoutDestinations()->exists();

            $user->payoutDestinations()->create([
                'type' => $request->string('type')->toString(),
                'provider_code' => $channel['code'],
                'provider_label' => $channel['label'],
                'account_number' => $request->string('account_number')->toString(),
                'account_holder' => $request->string('account_holder')->toString(),
                'is_default' => $isFirst,
            ]);
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
