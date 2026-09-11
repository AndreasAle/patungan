<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreSettlementRequest;
use App\Models\PayoutDestination;
use App\Models\Settlement;
use App\Payouts\AccountVerifier;
use App\Services\LedgerService;
use App\Services\SettlementService;
use App\Support\PayoutChannels;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PayoutController extends Controller
{
    public function __construct(
        private readonly SettlementService $settlements,
        private readonly LedgerService $ledger,
        private readonly AccountVerifier $verifier,
    ) {}

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('pencairan', [
            'balance' => [
                'available' => $this->ledger->availableBalance($user),
                'pending' => $this->ledger->pendingBalance($user),
                'paid_out' => $this->ledger->totalPaidOut($user),
            ],
            'destinations' => $user->payoutDestinations()->latest()->get()
                ->map(fn (PayoutDestination $destination) => [
                    'id' => $destination->id,
                    'type' => $destination->type->value,
                    'provider_code' => $destination->provider_code,
                    'provider_label' => $destination->provider_label,
                    'masked_number' => $destination->maskedAccountNumber(),
                    'label' => $destination->maskedLabel(),
                    'account_holder' => $destination->account_holder,
                    'verification_status' => $destination->verification_status->value,
                    'is_default' => $destination->is_default,
                ])->all(),
            // The grid of banks to withdraw somewhere new, without leaving
            // this page to go and register an account first.
            'channels' => PayoutChannels::all(),
            'inquiry_available' => $this->verifier->isAvailable(),
            'settlements' => $user->settlements()->latest('requested_at')->limit(25)->get()
                ->map(fn (Settlement $settlement) => [
                    'uuid' => $settlement->uuid,
                    /*
                     * A short, quotable reference. Support conversations about
                     * money need something a person can read down a phone line;
                     * a full UUID is not that, and a sequential id would leak
                     * how many payouts the platform has ever processed.
                     */
                    'reference' => 'PC-'.strtoupper(substr(str_replace('-', '', $settlement->uuid), 0, 8)),
                    'amount' => $settlement->amount,
                    'fee' => $settlement->fee,
                    'net_amount' => $settlement->net_amount,
                    'status' => $settlement->status->value,
                    'status_label' => $settlement->status->label(),
                    'destination' => $settlement->destination_account_reference,
                    'requested_at' => $settlement->requested_at?->toIso8601String(),
                    'processed_at' => $settlement->processed_at?->toIso8601String(),
                    'failure_reason' => $settlement->failure_reason,
                ])->all(),
            'payout' => [
                'min_amount' => (int) config('patungan.payout.min_amount'),
                'provider' => $this->settlements->providerName(),
                'automated' => $this->settlements->providerIsAutomated(),
            ],
        ]);
    }

    public function store(StoreSettlementRequest $request): RedirectResponse
    {
        $this->authorize('create', Settlement::class);

        $destination = PayoutDestination::query()
            ->where('user_id', $request->user()->id)
            ->findOrFail($request->integer('payout_destination_id'));

        $this->settlements->request($request->user(), $destination, $request->integer('amount'));

        return back()->with('success', 'Permintaan pencairan dikirim.');
    }
}
