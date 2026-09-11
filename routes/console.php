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

/*
 | The queue, which had no worker at all.
 |
 | Notifications to the organizer - somebody paid, the patungan completed -
 | are queued listeners. With QUEUE_CONNECTION=database and nothing draining
 | the table, they were written and never delivered: the money settled
 | correctly because that happens synchronously in the webhook, but the
 | organizer was never told. Nothing errors, nothing alerts, the jobs table
 | simply grows.
 |
 | This is the shared-hosting shape of a worker. A long-running supervisor
 | process is not available here, so a short one is started each minute and
 | told to exit as soon as the queue is empty. max-time is under the minute so
 | two never overlap even if withoutOverlapping's lock were lost.
 */
Schedule::command('queue:work --stop-when-empty --tries=3 --max-time=50 --quiet')
    ->everyMinute()
    ->withoutOverlapping();

/*
 | Housekeeping. Failed jobs are worth keeping long enough to investigate a
 | complaint about a missing email, and not a day longer - they contain the
 | notification payload, which names people and amounts.
 */
Schedule::command('queue:prune-failed --hours=168')->weekly();
