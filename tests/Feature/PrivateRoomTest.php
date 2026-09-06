<?php

namespace Tests\Feature;

use App\Enums\PatunganCategory;
use App\Enums\PatunganPrivacy;
use App\Enums\SplitType;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Models\Payment;
use App\Services\PatunganService;
use App\Services\PaymentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class PrivateRoomTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    /** A vendor room: lighting owes 5jt, sound owes 8jt, neither may see the other. */
    private function makeRoom(): Patungan
    {
        return app(PatunganService::class)->create($this->organizer(), [
            'title' => 'Wedding Samarupa',
            'description' => null,
            'category' => PatunganCategory::Acara->value,
            'split_type' => SplitType::Custom->value,
            'privacy_mode' => PatunganPrivacy::PrivateRoom->value,
            'participants' => [
                ['name' => 'Vendor Lighting', 'amount' => 5000000],
                ['name' => 'Vendor Sound', 'amount' => 8000000],
            ],
        ]);
    }

    private function pinFor(Patungan $patungan, string $name): string
    {
        return $patungan->participants()->where('name', $name)->firstOrFail()->access_pin;
    }

    public function test_every_participant_gets_a_unique_six_digit_pin(): void
    {
        $patungan = $this->makeRoom();

        $pins = $patungan->participants->map(fn (PatunganParticipant $p) => $p->access_pin);

        $this->assertCount(2, $pins->filter());
        $this->assertCount(2, $pins->unique());
        $pins->each(fn (string $pin) => $this->assertMatchesRegularExpression('/^\d{6}$/', $pin));
    }

    public function test_an_open_patungan_issues_no_pins(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);

        $this->assertNull($patungan->participants->first()->access_pin);
    }

    public function test_a_locked_room_reveals_nothing_about_anyone(): void
    {
        $patungan = $this->makeRoom();

        $response = $this->get(route('public.patungan.show', $patungan->public_token));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page->component('public/room')->where('patungan.participant', null));

        // No names, no amounts, no totals leak into the locked page.
        $response->assertDontSee('Vendor Lighting');
        $response->assertDontSee('Vendor Sound');
        $response->assertDontSee('5000000');
        $response->assertDontSee('8000000');
        $response->assertDontSee('13000000');
    }

    public function test_a_correct_pin_unlocks_only_that_participant(): void
    {
        $patungan = $this->makeRoom();

        $this->post(route('public.room.unlock', $patungan->public_token), ['pin' => $this->pinFor($patungan, 'Vendor Lighting')])
            ->assertRedirect(route('public.patungan.show', $patungan->public_token));

        $response = $this->get(route('public.patungan.show', $patungan->public_token));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->where('patungan.participant.name', 'Vendor Lighting')
            ->where('patungan.participant.amount_due', 5000000));

        $response->assertDontSee('Vendor Sound');
        $response->assertDontSee('8000000');
    }

    public function test_a_wrong_pin_is_rejected_and_grants_nothing(): void
    {
        $patungan = $this->makeRoom();

        $this->post(route('public.room.unlock', $patungan->public_token), ['pin' => '000000'])
            ->assertSessionHasErrors('pin');

        $this->get(route('public.patungan.show', $patungan->public_token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('patungan.participant', null));
    }

    public function test_the_status_endpoint_hides_aggregates_in_a_room(): void
    {
        $patungan = $this->makeRoom();

        $this->getJson(route('public.patungan.status', $patungan->public_token))
            ->assertOk()
            ->assertJsonMissingPath('collected_amount')
            ->assertJsonMissingPath('target_amount')
            ->assertJsonMissingPath('participant_count')
            ->assertJsonPath('participants', []);
    }

    public function test_one_vendor_cannot_start_a_payment_for_another(): void
    {
        $patungan = $this->makeRoom();
        $sound = $patungan->participants()->where('name', 'Vendor Sound')->firstOrFail();

        $this->post(route('public.room.unlock', $patungan->public_token), ['pin' => $this->pinFor($patungan, 'Vendor Lighting')]);

        $this->post(route('public.payment.store', [$patungan->public_token, $sound->uuid]))->assertForbidden();

        $this->assertSame(0, Payment::query()->count());
    }

    public function test_an_unlocked_vendor_can_pay_their_own_bill(): void
    {
        $patungan = $this->makeRoom();
        $lighting = $patungan->participants()->where('name', 'Vendor Lighting')->firstOrFail();

        $this->post(route('public.room.unlock', $patungan->public_token), ['pin' => $this->pinFor($patungan, 'Vendor Lighting')]);

        $this->post(route('public.payment.store', [$patungan->public_token, $lighting->uuid]))->assertRedirect();

        $this->assertSame(5000000, Payment::query()->firstOrFail()->amount);
    }

    public function test_a_visitor_without_a_pin_cannot_start_a_payment(): void
    {
        $patungan = $this->makeRoom();
        $lighting = $patungan->participants()->where('name', 'Vendor Lighting')->firstOrFail();

        $this->post(route('public.payment.store', [$patungan->public_token, $lighting->uuid]))->assertForbidden();
    }

    public function test_a_room_receipt_is_only_visible_to_the_vendor_who_unlocked_it(): void
    {
        $patungan = $this->makeRoom();
        $lighting = $patungan->participants()->where('name', 'Vendor Lighting')->firstOrFail();

        $payment = app(PaymentService::class)->createForParticipant($lighting);
        $this->postJson(route('webhooks.payments', 'sandbox'), $this->webhookPayload($payment))->assertOk();

        // Nobody has unlocked anything yet.
        $this->get(route('public.invoice.show', [$patungan->public_token, $lighting->uuid]))->assertForbidden();

        $this->post(route('public.room.unlock', $patungan->public_token), ['pin' => $this->pinFor($patungan, 'Vendor Sound')]);
        $this->get(route('public.invoice.show', [$patungan->public_token, $lighting->uuid]))->assertForbidden();

        $this->post(route('public.room.unlock', $patungan->public_token), ['pin' => $this->pinFor($patungan, 'Vendor Lighting')]);
        $this->get(route('public.invoice.show', [$patungan->public_token, $lighting->uuid]))->assertOk();
    }

    public function test_leaving_the_room_locks_it_again(): void
    {
        $patungan = $this->makeRoom();

        $this->post(route('public.room.unlock', $patungan->public_token), ['pin' => $this->pinFor($patungan, 'Vendor Lighting')]);
        $this->post(route('public.room.lock', $patungan->public_token))->assertRedirect();

        $this->get(route('public.patungan.show', $patungan->public_token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('patungan.participant', null));
    }

    public function test_participants_added_later_also_get_a_pin(): void
    {
        $organizer = $this->organizer();
        $patungan = app(PatunganService::class)->create($organizer, [
            'title' => 'Wedding Samarupa',
            'category' => PatunganCategory::Acara->value,
            'split_type' => SplitType::Custom->value,
            'privacy_mode' => PatunganPrivacy::PrivateRoom->value,
            'participants' => [['name' => 'Vendor Lighting', 'amount' => 5000000]],
        ]);

        $this->actingAs($organizer)->post(route('participant.store', $patungan->uuid), [
            'participants' => [['name' => 'Vendor Catering', 'amount' => 3000000]],
        ])->assertRedirect();

        $added = $patungan->participants()->where('name', 'Vendor Catering')->firstOrFail();

        $this->assertMatchesRegularExpression('/^\d{6}$/', $added->access_pin);
    }

    public function test_the_pin_is_encrypted_at_rest(): void
    {
        $patungan = $this->makeRoom();
        $participant = $patungan->participants->first();

        $stored = \DB::table('patungan_participants')->where('id', $participant->id)->value('access_pin');

        $this->assertNotSame($participant->access_pin, $stored);
        $this->assertStringNotContainsString($participant->access_pin, (string) $stored);
    }

    public function test_the_organizer_can_read_the_pins_to_hand_them_out(): void
    {
        $patungan = $this->makeRoom();

        $this->actingAs($patungan->organizer)
            ->get(route('patungan.show', $patungan))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('patungan.is_private_room', true)
                ->where('patungan.participants.0.access_pin', $this->pinFor($patungan, 'Vendor Lighting')));
    }

    public function test_an_open_patungan_never_exposes_a_pin_to_its_organizer(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);

        $this->actingAs($patungan->organizer)
            ->get(route('patungan.show', $patungan))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('patungan.participants.0.access_pin', null));
    }
}
