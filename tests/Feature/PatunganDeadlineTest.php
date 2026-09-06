<?php

namespace Tests\Feature;

use App\Enums\PatunganCategory;
use App\Enums\SplitType;
use App\Models\Patungan;
use App\Models\Payment;
use App\Payments\PaymentGatewayException;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class PatunganDeadlineTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_organizer_can_set_a_payment_deadline_when_creating_a_link(): void
    {
        $organizer = $this->organizer();
        $deadline = now()->addDays(3);

        $this->actingAs($organizer)->post(route('patungan.store'), [
            'title' => 'Badminton Minggu Malam',
            'category' => PatunganCategory::Olahraga->value,
            'split_type' => SplitType::Equal->value,
            'equal_amount' => 25000,
            'expires_at' => $deadline->toDateTimeString(),
            'participants' => [['name' => 'Andreas']],
        ])->assertRedirect();

        $patungan = Patungan::query()->firstOrFail();

        $this->assertNotNull($patungan->expires_at);
        $this->assertSame($deadline->format('Y-m-d H:i'), $patungan->expires_at->format('Y-m-d H:i'));
        $this->assertTrue($patungan->acceptsPayment());
    }

    public function test_a_deadline_in_the_past_is_rejected(): void
    {
        $this->actingAs($this->organizer())->post(route('patungan.store'), [
            'title' => 'Sudah lewat',
            'category' => PatunganCategory::Olahraga->value,
            'split_type' => SplitType::Equal->value,
            'equal_amount' => 25000,
            'expires_at' => now()->subDay()->toDateTimeString(),
            'participants' => [['name' => 'Andreas']],
        ])->assertSessionHasErrors('expires_at');

        $this->assertSame(0, Patungan::query()->count());
    }

    public function test_no_payment_can_be_started_after_the_deadline(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $patungan->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->post(route('public.payment.store', [$patungan->public_token, $patungan->participants->first()->uuid]))
            ->assertRedirect()
            ->assertSessionHas('error');

        $this->assertSame(0, Payment::query()->count());
    }

    public function test_the_service_refuses_an_expired_patungan(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $patungan->forceFill(['expires_at' => now()->subSecond()])->save();

        $this->expectException(PaymentGatewayException::class);

        app(PaymentService::class)->createForParticipant($patungan->participants()->first());
    }

    public function test_an_invoice_never_outlives_the_patungan_deadline(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        // Shorter than the 15 minute default invoice TTL.
        $patungan->forceFill(['expires_at' => now()->addMinutes(3)])->save();

        $payment = app(PaymentService::class)->createForParticipant($patungan->participants()->first());

        $this->assertTrue($payment->expires_at->lessThanOrEqualTo($patungan->expires_at));
    }

    public function test_organizer_can_extend_or_remove_the_deadline(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas']);
        $patungan->forceFill(['expires_at' => now()->addHour()])->save();

        $extended = now()->addDays(5);

        $this->actingAs($organizer)->patch(route('patungan.update', $patungan), [
            'title' => $patungan->title,
            'category' => $patungan->category->value,
            'name_privacy' => 'FULL',
            'expires_at' => $extended->toDateTimeString(),
        ])->assertRedirect();

        $this->assertSame($extended->format('Y-m-d H:i'), $patungan->fresh()->expires_at->format('Y-m-d H:i'));

        $this->actingAs($organizer)->patch(route('patungan.update', $patungan), [
            'title' => $patungan->title,
            'category' => $patungan->category->value,
            'name_privacy' => 'FULL',
            'expires_at' => null,
        ])->assertRedirect();

        $this->assertNull($patungan->fresh()->expires_at);
    }

    public function test_the_public_page_reports_the_deadline(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $patungan->forceFill(['expires_at' => now()->subMinute()])->save();

        $this->getJson(route('public.patungan.status', $patungan->public_token))
            ->assertOk()
            ->assertJsonPath('accepts_payment', false);

        $this->get(route('public.patungan.show', $patungan->public_token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('patungan.has_expired', true)->where('patungan.accepts_payment', false));
    }
}
