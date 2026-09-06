<?php

namespace App\Notifications;

use App\Models\Patungan;
use App\Support\Money;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PatunganCompletedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly Patungan $patungan) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /** @return array<string, mixed> */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'patungan_completed',
            'title' => 'Semua sudah lunas',
            'body' => $this->patungan->title.' sudah lunas '.Money::format($this->patungan->collected_amount).'.',
            'patungan_uuid' => $this->patungan->uuid,
            'patungan_title' => $this->patungan->title,
        ];
    }
}
