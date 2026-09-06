<?php

namespace App\Events;

use App\Enums\PaymentMethod;
use App\Models\PatunganParticipant;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ParticipantPaid
{
    use Dispatchable, SerializesModels;

    public function __construct(
        public PatunganParticipant $participant,
        public PaymentMethod $method,
    ) {}
}
