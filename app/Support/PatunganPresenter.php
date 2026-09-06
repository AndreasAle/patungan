<?php

namespace App\Support;

use App\Enums\ParticipantStatus;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Models\Payment;

/**
 * Shapes models for the frontend. Public payloads are built by a separate method
 * so it is obvious - and reviewable - exactly what a share link exposes.
 */
class PatunganPresenter
{
    /** @return array<string, mixed> */
    public function card(Patungan $patungan): array
    {
        return [
            'uuid' => $patungan->uuid,
            'title' => $patungan->title,
            'category' => $patungan->category->value,
            'category_label' => $patungan->category->label(),
            'status' => $patungan->status->value,
            'status_label' => $patungan->status->label(),
            'target_amount' => $patungan->target_amount,
            'collected_amount' => $patungan->collected_amount,
            'participant_count' => $patungan->participant_count,
            'paid_participant_count' => $patungan->paid_participant_count,
            'public_url' => $patungan->publicUrl(),
            'event_date' => $patungan->event_date?->toDateString(),
            'expires_at' => $patungan->expires_at?->toIso8601String(),
            'has_expired' => $patungan->hasExpired(),
            'created_at' => $patungan->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public function organizerDetail(Patungan $patungan): array
    {
        return array_merge($this->card($patungan), [
            'description' => $patungan->description,
            'split_type' => $patungan->split_type->value,
            'split_type_label' => $patungan->split_type->label(),
            'equal_amount' => $patungan->equal_amount,
            'name_privacy' => $patungan->name_privacy->value,
            'public_token' => $patungan->public_token,
            'completed_at' => $patungan->completed_at?->toIso8601String(),
            'closed_at' => $patungan->closed_at?->toIso8601String(),
            'participants' => $patungan->participants
                ->map(fn (PatunganParticipant $p) => $this->organizerParticipant($p))
                ->values()
                ->all(),
        ]);
    }

    /** @return array<string, mixed> */
    public function organizerParticipant(PatunganParticipant $participant): array
    {
        return [
            'uuid' => $participant->uuid,
            'name' => $participant->name,
            'note' => $participant->note,
            'amount_due' => $participant->amount_due,
            'amount_paid' => $participant->amount_paid,
            'status' => $participant->status->value,
            'status_label' => $participant->status->label(),
            'paid_method' => $participant->paid_method?->value,
            'paid_at' => $participant->paid_at?->toIso8601String(),
        ];
    }

    /**
     * The share-link payload. Deliberately excludes the organizer's identity,
     * payout details, gateway references and any raw provider data.
     *
     * @return array<string, mixed>
     */
    public function publicView(Patungan $patungan): array
    {
        return [
            'title' => $patungan->title,
            'description' => $patungan->description,
            'category' => $patungan->category->value,
            'category_label' => $patungan->category->label(),
            'status' => $patungan->status->value,
            'status_label' => $patungan->status->label(),
            'split_type' => $patungan->split_type->value,
            'equal_amount' => $patungan->equal_amount,
            'target_amount' => $patungan->target_amount,
            'collected_amount' => $patungan->collected_amount,
            'participant_count' => $patungan->participant_count,
            'paid_participant_count' => $patungan->paid_participant_count,
            'event_date' => $patungan->event_date?->toDateString(),
            'expires_at' => $patungan->expires_at?->toIso8601String(),
            'has_expired' => $patungan->hasExpired(),
            'accepts_payment' => $patungan->acceptsPayment(),
            'public_token' => $patungan->public_token,
            'organizer_name' => $patungan->organizer->name,
            'participants' => $patungan->participants
                ->map(fn (PatunganParticipant $p) => $this->publicParticipant($patungan, $p))
                ->values()
                ->all(),
        ];
    }

    /** @return array<string, mixed> */
    public function publicParticipant(Patungan $patungan, PatunganParticipant $participant): array
    {
        return [
            'uuid' => $participant->uuid,
            'name' => $patungan->displayName($participant->name),
            'note' => $participant->note,
            'amount_due' => $participant->amount_due,
            'status' => $participant->status->value,
            'status_label' => $participant->status->label(),
            'is_paid' => $participant->status === ParticipantStatus::Paid,
            'paid_at' => $participant->paid_at?->toIso8601String(),
        ];
    }

    /**
     * The payment payload shown on the public QRIS page. No gateway transaction
     * id and no raw provider response ever reach the browser.
     *
     * @return array<string, mixed>
     */
    public function publicPayment(Payment $payment): array
    {
        return [
            'uuid' => $payment->uuid,
            'status' => $payment->status->value,
            'status_label' => $payment->status->label(),
            'amount' => $payment->amount,
            'service_fee' => $payment->service_fee,
            'charged_amount' => $payment->charged_amount,
            'qr_string' => $payment->qr_string,
            'qr_url' => $payment->qr_url,
            'expires_at' => $payment->expires_at?->toIso8601String(),
            'paid_at' => $payment->paid_at?->toIso8601String(),
            'simulated' => $payment->gateway === 'sandbox',
        ];
    }
}
