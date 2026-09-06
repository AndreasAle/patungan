<?php

namespace App\Notifications;

use App\Models\PatunganParticipant;
use App\Support\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

/**
 * In-app only for now. Adding a WhatsApp or mail channel later means listing it
 * in via() - nothing else has to change.
 */
class ParticipantPaidNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly PatunganParticipant $participant) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'participant_paid',
            'title' => $this->participant->name.' sudah bayar',
            'body' => $this->participant->name.' sudah bayar '.Money::format($this->participant->amount_paid).'.',
            'patungan_uuid' => $this->participant->patungan->uuid,
            'patungan_title' => $this->participant->patungan->title,
        ];
    }
}
