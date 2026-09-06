<?php

use Illuminate\Support\Facades\Schedule;

// Keeps abandoned QRIS invoices from blocking a participant's retry.
Schedule::command('payments:expire')->everyMinute()->withoutOverlapping();
