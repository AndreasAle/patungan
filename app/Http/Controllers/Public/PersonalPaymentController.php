<?php

namespace App\Http\Controllers\Public;

use App\Enums\ParticipantStatus;
use App\Http\Controllers\Controller;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Services\Analytics;
use App\Support\Money;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A participant's own payment page, reached by an opaque personal token.
 *
 * The link is sent through WhatsApp, forwarded, and screenshotted, so it is
 * treated as a credential that anyone might end up holding. What it grants is
 * therefore kept to the minimum that makes the page work: this participant's
 * display name, this participant's amount, and the public facts about the
 * patungan that the group link already shows.
 *
 * What it must never do is become a way to walk the participant list. The
 * payload below contains exactly one participant, carries no ids that could be
 * incremented, and no other participant's token is derivable from it.
 */
class PersonalPaymentController extends Controller
{
    public function __construct(private readonly Analytics $analytics) {}

    public function show(Request $request, string $token, string $payToken): Response
    {
        $patungan = Patungan::query()
            ->where('public_token', $token)
            ->with('organizer')
            ->firstOrFail();

        /*
         * Scoped to this patungan as well as the token. The token alone is
         * already unique, but pairing it with the patungan means a token pasted
         * under the wrong public link is a 404 rather than a page showing a
         * bill from a completely different group.
         */
        $participant = PatunganParticipant::query()
            ->where('patungan_id', $patungan->id)
            ->where('pay_token', $payToken)
            ->first();

        if ($participant === null) {
            return Inertia::render('public/personal-invalid', [
                'patungan_url' => $patungan->publicUrl(),
            ]);
        }

        $this->analytics->record(
            Analytics::PERSONAL_LINK_OPENED,
            [],
            patunganId: $patungan->id,
            visitorKey: $request->ip(),
        );

        $settled = $participant->status->isSettled();

        return Inertia::render('public/personal-pay', [
            'patungan' => [
                'title' => $patungan->title,
                'category' => $patungan->category->value,
                'category_label' => $patungan->category->label(),
                'public_token' => $patungan->public_token,
                'public_url' => $patungan->publicUrl(),
                'organizer_name' => $patungan->organizer->name,
                'accepts_payment' => $patungan->acceptsPayment(),
                'expires_at' => $patungan->expires_at?->toIso8601String(),
                'is_private_room' => $patungan->isPrivateRoom(),
            ],
            'participant' => [
                /*
                 * The UUID is needed to open a payment and is already exposed on
                 * the public page for every participant, so it adds nothing here.
                 * The pay token itself is deliberately not sent back: it is in
                 * the address bar, and putting it in the payload as well only
                 * widens where it can end up.
                 */
                'uuid' => $participant->uuid,
                'name' => $patungan->displayName($participant->name),
                'amount_due' => (int) $participant->amount_due,
                'amount_due_formatted' => Money::format((int) $participant->amount_due),
                'status' => $participant->status->value,
                'status_label' => $participant->status->label(),
                'is_settled' => $settled,
                'is_pending' => $participant->status === ParticipantStatus::Pending,
                'invoice_url' => $participant->hasInvoice()
                    ? route('public.invoice.show', [$patungan->public_token, $participant->uuid])
                    : null,
            ],
            // Where "Bayar Sekarang" posts. Building it here keeps the token out
            // of the React component entirely.
            'pay_url' => route('public.payment.store', [$patungan->public_token, $participant->uuid]),
        ]);
    }
}
