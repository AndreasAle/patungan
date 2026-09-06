<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Models\Payment;
use App\Payments\PaymentGatewayException;
use App\Services\Analytics;
use App\Services\PaymentService;
use App\Support\PatunganPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicPaymentController extends Controller
{
    public function __construct(
        private readonly PaymentService $payments,
        private readonly PatunganPresenter $presenter,
        private readonly Analytics $analytics,
    ) {}

    /**
     * Opens a QRIS invoice for a participant.
     *
     * The request carries only the participant's public UUID; the amount is
     * always read from the database inside PaymentService.
     */
    public function store(Request $request, string $token, string $participantUuid): RedirectResponse
    {
        [$patungan, $participant] = $this->resolve($token, $participantUuid);

        $this->analytics->record(
            Analytics::PARTICIPANT_SELECTED,
            [],
            patunganId: $patungan->id,
            visitorKey: $request->ip(),
        );

        try {
            $payment = $this->payments->createForParticipant($participant, $request->ip());
        } catch (PaymentGatewayException $e) {
            return back()->with('error', $e->getMessage());
        }

        return redirect()->route('public.payment.show', [
            'token' => $token,
            'payment' => $payment->uuid,
        ]);
    }

    public function show(string $token, string $paymentUuid): Response
    {
        [$patungan, $payment] = $this->resolvePayment($token, $paymentUuid);

        return Inertia::render('public/payment', [
            'patungan' => [
                'title' => $patungan->title,
                'public_token' => $patungan->public_token,
                'category_label' => $patungan->category->label(),
            ],
            'participant' => [
                'name' => $patungan->displayName($payment->participant->name),
            ],
            'payment' => $this->presenter->publicPayment($payment),
        ]);
    }

    /**
     * Status polled by the payment page. The verdict comes from our payment
     * record, never from a query string the browser could fake.
     */
    public function status(string $token, string $paymentUuid): JsonResponse
    {
        [, $payment] = $this->resolvePayment($token, $paymentUuid);

        return response()->json([
            'status' => $payment->status->value,
            'status_label' => $payment->status->label(),
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'expires_at' => $payment->expires_at?->toIso8601String(),
        ]);
    }

    /** @return array{0: Patungan, 1: PatunganParticipant} */
    private function resolve(string $token, string $participantUuid): array
    {
        $patungan = Patungan::query()->where('public_token', $token)->firstOrFail();

        $participant = PatunganParticipant::query()
            ->where('patungan_id', $patungan->id)
            ->where('uuid', $participantUuid)
            ->firstOrFail();

        return [$patungan, $participant];
    }

    /** @return array{0: Patungan, 1: Payment} */
    private function resolvePayment(string $token, string $paymentUuid): array
    {
        $patungan = Patungan::query()->where('public_token', $token)->firstOrFail();

        $payment = Payment::query()
            ->with('participant')
            ->where('patungan_id', $patungan->id)
            ->where('uuid', $paymentUuid)
            ->firstOrFail();

        return [$patungan, $payment];
    }
}
