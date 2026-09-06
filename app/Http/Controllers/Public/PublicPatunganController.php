<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Patungan;
use App\Services\Analytics;
use App\Services\FeeCalculator;
use App\Support\PatunganPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicPatunganController extends Controller
{
    public function __construct(
        private readonly PatunganPresenter $presenter,
        private readonly FeeCalculator $fees,
        private readonly Analytics $analytics,
    ) {}

    public function show(Request $request, string $token): Response
    {
        $patungan = $this->resolve($token);

        $this->analytics->record(
            Analytics::SHARE_CLICKED,
            [],
            patunganId: $patungan->id,
            visitorKey: $request->ip(),
        );

        return Inertia::render('public/patungan', [
            'patungan' => $this->presenter->publicView($patungan),
            'fee_bearer' => $this->fees->bearer(),
        ]);
    }

    /** Lightweight polling endpoint so the page can reflect payments as they land. */
    public function status(string $token): JsonResponse
    {
        $patungan = $this->resolve($token);

        return response()->json([
            'status' => $patungan->status->value,
            'accepts_payment' => $patungan->acceptsPayment(),
            'expires_at' => $patungan->expires_at?->toIso8601String(),
            'collected_amount' => $patungan->collected_amount,
            'target_amount' => $patungan->target_amount,
            'paid_participant_count' => $patungan->paid_participant_count,
            'participant_count' => $patungan->participant_count,
            'participants' => $patungan->participants->map(fn ($participant) => [
                'uuid' => $participant->uuid,
                'status' => $participant->status->value,
                'is_paid' => $participant->status->isSettled(),
                'paid_at' => $participant->paid_at?->toIso8601String(),
            ])->values()->all(),
        ]);
    }

    /** Public links are addressed by an unguessable token, never a sequential id. */
    private function resolve(string $token): Patungan
    {
        return Patungan::query()
            ->with(['participants', 'organizer'])
            ->where('public_token', $token)
            ->firstOrFail();
    }
}
