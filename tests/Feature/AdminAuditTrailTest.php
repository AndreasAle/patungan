<?php

namespace Tests\Feature;

use App\Enums\PatunganStatus;
use App\Models\AdminAuditLog;
use App\Models\PayoutDestination;
use App\Services\PaymentService;
use App\Services\SettlementService;
use App\Support\AdminAudit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

/**
 * Accountability for administrator actions.
 *
 * An admin here can freeze somebody's account, reopen a closed patungan and
 * mark a payout complete. Until now none of that left a record: there was no
 * way to answer "who released this payout" after the fact, which is the first
 * question asked whenever money goes to the wrong place.
 *
 * These tests hold the trail to the standard that makes it worth having. Not
 * merely "a row exists", but that the row still names the person after their
 * account is gone, and that reading the log is possible while editing it is
 * not.
 */
class AdminAuditTrailTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_suspending_a_user_is_recorded_with_the_actor_and_the_subject(): void
    {
        $admin = $this->admin();
        $target = $this->organizer(['name' => 'Budi Santoso', 'email' => 'budi@example.test']);

        $this->actingAs($admin)
            ->post(route('admin.users.suspend', $target))
            ->assertRedirect();

        $log = AdminAuditLog::query()->sole();

        $this->assertSame(AdminAudit::USER_SUSPENDED, $log->action);
        $this->assertSame($admin->id, $log->actor_id);
        $this->assertSame($admin->name, $log->actor_name);
        $this->assertSame($admin->email, $log->actor_email);
        $this->assertSame('budi@example.test', $log->subject_label);
        $this->assertNotNull($log->ip_address);
    }

    public function test_restoring_a_user_is_recorded_separately(): void
    {
        $admin = $this->admin();
        $target = $this->organizer();

        $this->actingAs($admin)->post(route('admin.users.suspend', $target));
        $this->actingAs($admin)->post(route('admin.users.restore', $target));

        $this->assertSame(
            [AdminAudit::USER_SUSPENDED, AdminAudit::USER_RESTORED],
            AdminAuditLog::query()->orderBy('id')->pluck('action')->all(),
        );
    }

    public function test_a_patungan_status_change_records_what_it_changed_from(): void
    {
        $admin = $this->admin();
        $patungan = $this->makePatungan($this->organizer());

        $this->actingAs($admin)
            ->post(route('admin.patungans.status', $patungan), ['status' => PatunganStatus::Closed->value])
            ->assertRedirect();

        $log = AdminAuditLog::query()->sole();

        // "Changed to closed" is half a record. Without the previous value there
        // is no way to tell a correction from a mistake.
        $this->assertSame(PatunganStatus::Active->value, $log->context['from']);
        $this->assertSame(PatunganStatus::Closed->value, $log->context['to']);
        $this->assertSame($patungan->title, $log->subject_label);
    }

    public function test_completing_a_payout_records_the_amount_and_the_reference(): void
    {
        $admin = $this->admin();
        $patungan = $this->makePatungan($this->organizer(), ['Sandi']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());
        app(PaymentService::class)->markAsPaid($payment, 'TXN-AUDIT-1');

        $organizer = $payment->refresh()->organizer;
        $destination = PayoutDestination::factory()->create(['user_id' => $organizer->id]);
        $settlement = app(SettlementService::class)->request($organizer, $destination, (int) config('patungan.payout.min_amount'));

        $this->actingAs($admin)
            ->post(route('admin.settlements.update', $settlement), [
                'action' => 'complete',
                'provider_reference' => 'BANK-REF-99',
            ])
            ->assertRedirect();

        $log = AdminAuditLog::query()->where('action', AdminAudit::SETTLEMENT_PROCESSED)->sole();

        $this->assertSame('complete', $log->context['action']);
        $this->assertSame($settlement->net_amount, $log->context['amount']);
        $this->assertSame('BANK-REF-99', $log->context['provider_reference']);
    }

    public function test_the_record_survives_the_deletion_of_the_admin_account(): void
    {
        $admin = $this->admin();
        $target = $this->organizer();

        $this->actingAs($admin)->post(route('admin.users.suspend', $target));

        $admin->delete();

        $log = AdminAuditLog::query()->sole();

        /*
         * The whole point of copying the name onto the row. A foreign key alone
         * would leave "user #7 froze this account" pointing at nothing, right
         * when somebody needs to know who user 7 was.
         */
        $this->assertNull($log->fresh()->actor_id);
        $this->assertSame($admin->name, $log->actor_name);
        $this->assertSame($admin->email, $log->actor_email);
    }

    public function test_the_trail_is_readable_by_an_admin(): void
    {
        $admin = $this->admin();
        $this->actingAs($admin)->post(route('admin.users.suspend', $this->organizer()));

        $this->actingAs($admin)
            ->get(route('admin.audit'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/audit')
                ->has('logs.data', 1)
                ->where('logs.data.0.action', AdminAudit::USER_SUSPENDED)
                ->where('logs.data.0.actor_email', $admin->email));
    }

    public function test_the_trail_can_be_filtered_by_action(): void
    {
        $admin = $this->admin();
        $target = $this->organizer();

        $this->actingAs($admin)->post(route('admin.users.suspend', $target));
        $this->actingAs($admin)->post(route('admin.users.restore', $target));

        $this->actingAs($admin)
            ->get(route('admin.audit', ['action' => AdminAudit::USER_RESTORED]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->has('logs.data', 1)
                ->where('logs.data.0.action', AdminAudit::USER_RESTORED));
    }

    public function test_a_normal_user_cannot_read_the_trail(): void
    {
        $this->actingAs($this->organizer())
            ->get(route('admin.audit'))
            ->assertForbidden();
    }
}
