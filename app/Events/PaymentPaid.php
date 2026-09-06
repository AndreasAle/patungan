<?php

namespace App\Events;

use App\Models\Payment;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/** Dispatched after the paid-payment transaction has committed. */
class PaymentPaid
{
    use Dispatchable, SerializesModels;

    public function __construct(public Payment $payment) {}
}
