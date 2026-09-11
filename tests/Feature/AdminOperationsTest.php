<?php

namespace Tests\Feature;

use App\Enums\PaymentStatus;
use App\Models\AdminAuditLog;
use App\Models\Payment;
use App\Services\PaymentService;
use App\Support\AdminAudit;
use App\Support\AdminWindow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

/**
 * The three things an admin panel needs once it can be trusted: a time
 * dimension, a way to find one record out of thousands, and a way to get the
 * numbers into a spreadsheet.
 */
class AdminOperationsTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    private function paidPayment(string $reference, ?string $paidAt = null): Payment
    {
        $patungan = $this->makePatungan($this->organizer(), ['Sandi']);
        $payment = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        app(PaymentService::class)->markAsPaid($payment, $reference);
        $payment->refresh();

        if ($paidAt !== null) {
            $payment->forceFill(['paid_at' => $paidAt, 'created_at' => $paidAt])->save();
        }

        return $payment->refresh();
    }

    public function test_the_window_excludes_what_happened_before_it(): void
    {
        $this->paidPayment('TXN-OLD', now()->subDays(60)->toDateTimeString());
        $this->paidPayment('TXN-NEW');

        $recent = $this->actingAs($this->admin())->get(route('admin.dashboard', ['range' => '7d']));
        $lifetime = $this->actingAs($this->admin())->get(route('admin.dashboard', ['range' => 'all']));

        $countPaid = fn ($response) => collect($response->viewData('page')['props']['flows'])
            ->firstWhere('key', 'payments_paid')['value'];

        $this->assertSame(1, $countPaid($recent), 'A payment from two months ago is not this week.');
        $this->assertSame(2, $countPaid($lifetime));
    }

    public function test_a_stale_range_falls_back_instead_of_erroring(): void
    {
        // A bookmarked URL from an older build should show a dashboard, not a 500.
        $this->actingAs($this->admin())
            ->get(route('admin.dashboard', ['range' => 'sejak-kemarin']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('window.value', '30d'));
    }

    public function test_a_lifetime_window_offers_no_comparison(): void
    {
        /*
         * There is no period before "sejak awal", so any percentage shown
         * against it would be invented. The delta must be null rather than zero,
         * which the page would render as "0% dari periode sebelumnya".
         */
        $window = AdminWindow::make('all');

        $this->assertNull($window->delta(500, 250));
    }

    public function test_growth_from_nothing_is_not_a_percentage(): void
    {
        $window = AdminWindow::make('7d');

        $this->assertNull($window->delta(10, 0), 'The first payment ever taken is not "+100%".');
        $this->assertSame(100.0, $window->delta(20, 10));
        $this->assertSame(-50.0, $window->delta(5, 10));
    }

    public function test_held_balance_ignores_the_range_because_it_is_a_level(): void
    {
        $this->paidPayment('TXN-STOCK', now()->subDays(60)->toDateTimeString());

        $balance = fn (string $range) => collect(
            $this->actingAs($this->admin())->get(route('admin.dashboard', ['range' => $range]))->viewData('page')['props']['stocks']
        )->firstWhere('key', 'balance_held')['value'];

        // The money is still held today regardless of which range is selected.
        $this->assertSame($balance('all'), $balance('24h'));
        $this->assertGreaterThan(0, $balance('24h'));
    }

    public function test_search_finds_a_payment_by_its_reference(): void
    {
        $payment = $this->paidPayment('TXN-FINDME');

        $response = $this->actingAs($this->admin())
            ->getJson(route('admin.search', ['q' => $payment->gateway_reference]))
            ->assertOk();

        $titles = collect($response->json('groups'))
            ->flatMap(fn (array $group) => array_column($group['items'], 'title'));

        $this->assertContains($payment->gateway_reference, $titles->all());
    }

    public function test_search_finds_a_user_by_email(): void
    {
        $this->organizer(['name' => 'Dewi Lestari', 'email' => 'dewi@example.test']);

        $response = $this->actingAs($this->admin())
            ->getJson(route('admin.search', ['q' => 'dewi@example']))
            ->assertOk();

        $this->assertSame('Pengguna', $response->json('groups.0.label'));
        $this->assertSame('Dewi Lestari', $response->json('groups.0.items.0.title'));
    }

    public function test_search_ignores_a_term_too_short_to_mean_anything(): void
    {
        $this->organizer(['name' => 'Dewi Lestari']);

        // One character would scan every table to return everything.
        $this->actingAs($this->admin())
            ->getJson(route('admin.search', ['q' => 'd']))
            ->assertOk()
            ->assertJson(['groups' => []]);
    }

    public function test_search_is_closed_to_normal_users(): void
    {
        $this->actingAs($this->organizer())
            ->getJson(route('admin.search', ['q' => 'anything']))
            ->assertForbidden();
    }

    public function test_the_payments_export_contains_the_rows(): void
    {
        $payment = $this->paidPayment('TXN-EXPORT');

        $response = $this->actingAs($this->admin())
            ->get(route('admin.export', ['dataset' => 'payments', 'range' => 'all']))
            ->assertOk();

        $csv = $response->streamedContent();

        $this->assertStringContainsString('reference', $csv);
        $this->assertStringContainsString($payment->gateway_reference, $csv);
        $this->assertStringContainsString((string) $payment->net_amount, $csv);
    }

    public function test_the_export_honours_the_status_filter(): void
    {
        $paid = $this->paidPayment('TXN-PAID');

        $patungan = $this->makePatungan($this->organizer(), ['Rian']);
        $pending = app(PaymentService::class)->createForParticipant($patungan->participants->first());

        $csv = $this->actingAs($this->admin())
            ->get(route('admin.export', [
                'dataset' => 'payments',
                'range' => 'all',
                'status' => PaymentStatus::Paid->value,
            ]))
            ->streamedContent();

        $this->assertStringContainsString($paid->gateway_reference, $csv);
        $this->assertStringNotContainsString($pending->gateway_reference, $csv);
    }

    public function test_every_export_is_audited(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)
            ->get(route('admin.export', ['dataset' => 'settlements', 'range' => '7d']))
            ->assertOk();

        $log = AdminAuditLog::query()->where('action', AdminAudit::DATA_EXPORTED)->sole();

        /*
         * An export is the one admin action that moves customer names out of
         * the system, where no later access control reaches them. Who pulled
         * the file and covering what has to be answerable afterwards.
         */
        $this->assertSame($admin->email, $log->actor_email);
        $this->assertSame('settlements', $log->subject_label);
        $this->assertSame('7d', $log->context['range']);
    }

    public function test_an_unknown_dataset_is_not_exportable(): void
    {
        $this->actingAs($this->admin())
            ->get(route('admin.export', ['dataset' => 'users', 'range' => 'all']))
            ->assertNotFound();
    }

    public function test_exports_are_closed_to_normal_users(): void
    {
        $this->actingAs($this->organizer())
            ->get(route('admin.export', ['dataset' => 'payments']))
            ->assertForbidden();
    }
}
