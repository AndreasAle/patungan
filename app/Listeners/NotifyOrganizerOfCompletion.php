<?php

namespace App\Listeners;

use App\Events\PatunganCompleted;
use App\Notifications\PatunganCompletedNotification;
use Illuminate\Contracts\Queue\ShouldQueue;

class NotifyOrganizerOfCompletion implements ShouldQueue
{
    public function handle(PatunganCompleted $event): void
    {
        $patungan = $event->patungan->loadMissing('organizer');

        $patungan->organizer->notify(new PatunganCompletedNotification($patungan));
    }
}
