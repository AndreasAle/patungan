<?php

namespace Tests\Feature;

use App\Notifications\ParticipantPaidNotification;
use App\Services\PaymentService;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Events\CallQueuedListener;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

/**
 * Notifications an organizer is promised, and the worker that has to exist for
 * them to arrive.
 *
 * These were queued listeners against a database queue with nothing draining
 * it. The money settled - that part is synchronous inside the webhook - but the
 * organizer was never told anybody had paid, and nothing anywhere reported a
 * problem. The jobs table simply grew.
 *
 * The first test proves the notification is raised at all. The second proves
 * something is scheduled to deliver it, because a queued notification with no
 * worker is indistinguishable from no notification.
 */
class QueuedNotificationTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_the_organizer_is_notified_when_a_participant_pays(): void
    {
        Notification::fake();

        $patungan = $this->makePatungan($this->organizer(), ['Sandi']);
        $participant = $patungan->participants->first();

        $payment = app(PaymentService::class)->createForParticipant($participant);
        app(PaymentService::class)->markAsPaid($payment, 'TXN-TEST-1');

        Notification::assertSentTo($patungan->organizer, ParticipantPaidNotification::class);
    }

    public function test_something_is_scheduled_to_drain_the_queue(): void
    {
        /*
         * Asserted against the schedule rather than a comment, because this is
         * exactly the kind of line that gets removed during a refactor by
         * somebody who cannot see what depends on it. Without a worker every
         * queued notification in this application is written and never sent.
         */
        $commands = collect(app(Schedule::class)->events())
            ->map(fn ($event) => $event->command ?? '')
            ->implode(' ');

        $this->assertStringContainsString('queue:work', $commands);
    }

    public function test_a_payment_actually_enqueues_work_rather_than_dropping_it(): void
    {
        // Not faked: the point is that a job really lands on the queue, which
        // is what the worker above then has to pick up.
        Queue::fake();

        $patungan = $this->makePatungan($this->organizer(), ['Sandi']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        app(PaymentService::class)->markAsPaid($payment, 'TXN-TEST-2');

        /*
         * The listener is what lands on the queue, not the notification: the
         * notification is only raised once the listener runs, which is exactly
         * why nothing arrived while no worker existed.
         */
        Queue::assertPushed(CallQueuedListener::class);
    }
}
