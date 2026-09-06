<?php

namespace App\Events;

use App\Models\Settlement;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PayoutCompleted
{
    use Dispatchable, SerializesModels;

    public function __construct(public Settlement $settlement) {}
}
