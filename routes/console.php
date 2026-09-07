<?php

use Illuminate\Support\Facades\Schedule;

// Keeps abandoned QRIS invoices from blocking a participant's retry.
Schedule::command('payments:expire')->everyMinute()->withoutOverlapping();

/*
 | Safety net for notifications that never arrived. Every two minutes, and only
 | for invoices already pending for three, so a healthy webhook path does
 | almost no provider queries at all.
 */
Schedule::command('payments:reconcile')->everyTwoMinutes()->withoutOverlapping();
