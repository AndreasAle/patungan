<?php

namespace App\Listeners;

use App\Events\ParticipantPaid;
use App\Notifications\ParticipantPaidNotification;
use Illuminate\Contracts\Queue\ShouldQueue;

class NotifyOrganizerOfParticipantPayment implements ShouldQueue
{
    public function handle(ParticipantPaid $event): void
    {
        $participant = $event->participant->loadMissing('patungan.organizer');
        $organizer = $participant->patungan->organizer;

        // The organizer marking their own cash payment does not need a ping.
        if ($participant->marked_by_user_id === $organizer->id) {
            return;
        }

        $organizer->notify(new ParticipantPaidNotification($participant));
    }
}
