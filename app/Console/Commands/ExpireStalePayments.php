<?php

namespace App\Console\Commands;

use App\Services\PaymentService;
use Illuminate\Console\Command;

class ExpireStalePayments extends Command
{
    protected $signature = 'payments:expire';

    protected $description = 'Expire QRIS invoices past their deadline so participants can pay again';

    public function handle(PaymentService $payments): int
    {
        $count = $payments->expireStalePayments();

        $this->info("Expired {$count} payment(s).");

        return self::SUCCESS;
    }
}
