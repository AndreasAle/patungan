<?php

namespace App\Http\Controllers\Public;

use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Support\RoomAccess;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The receipt a participant gets once their share is settled.
 *
 * It is addressed by the participant's UUID under the share token, and shows
 * only what a receipt needs - never the gateway reference or the organizer's
 * private details.
 */
class InvoiceController extends Controller
{
    public function show(Request $request, string $token, string $participantUuid): Response
    {
        $patungan = Patungan::query()
            ->with('organizer:id,name')
            ->where('public_token', $token)
            ->firstOrFail();

        $participant = PatunganParticipant::query()
            ->where('patungan_id', $patungan->id)
            ->where('uuid', $participantUuid)
            ->firstOrFail();

        // No receipt exists until the share is actually settled.
        abort_unless($participant->hasInvoice(), 404);

        // A private room receipt belongs to the vendor who unlocked it, nobody else.
        abort_unless(RoomAccess::allows($request, $patungan, $participant), 403);

        return Inertia::render('public/invoice', [
            'invoice' => [
                'number' => $participant->invoice_number,
                'issued_at' => $participant->paid_at?->toIso8601String(),
                'amount' => $participant->amount_paid,
                'method' => $participant->paid_method?->value,
                'method_label' => $participant->paid_method?->label(),
                'is_manual' => $participant->paid_method === PaymentMethod::Manual,
                'participant_name' => $patungan->displayName($participant->name),
                'note' => $participant->note,
                'verify_url' => route('public.invoice.show', [$token, $participantUuid]),
            ],
            'patungan' => [
                'title' => $patungan->title,
                'category' => $patungan->category->value,
                'public_token' => $patungan->public_token,
                'organizer_name' => $patungan->organizer->name,
            ],
        ]);
    }
}
