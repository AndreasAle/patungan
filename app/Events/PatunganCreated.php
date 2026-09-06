<?php

namespace App\Events;

use App\Models\Patungan;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PatunganCreated
{
    use Dispatchable, SerializesModels;

    public function __construct(public Patungan $patungan) {}
}
