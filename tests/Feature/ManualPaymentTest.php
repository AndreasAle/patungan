<?php

namespace Tests\Feature;

use App\Enums\ParticipantStatus;
use App\Enums\PaymentMethod;
use App\Models\WalletLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class ManualPaymentTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_organizer_can_record_a_cash_payment_and_it_is_attributed(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas', 'Niko']);
        $participant = $patungan->participants->first();

        $this->actingAs($organizer)
            ->post(route('participant.mark-paid', [$patungan->uuid, $participant->uuid]))
            ->assertRedirect();

        $participant->refresh();

        $this->assertSame(ParticipantStatus::Paid, $participant->status);
        $this->assertSame(PaymentMethod::Manual, $participant->paid_method);
        $this->assertSame(25000, $participant->amount_paid);
        $this->assertSame($organizer->id, $participant->marked_by_user_id);
        $this->assertSame(25000, $patungan->fresh()->collected_amount);

        // Cash never reached the platform, so no ledger entry may be created.
        $this->assertSame(0, WalletLedger::query()->count());
    }

    public function test_marking_paid_twice_does_not_double_the_collected_amount(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas', 'Niko']);
        $participant = $patungan->participants->first();

        $this->actingAs($organizer)->post(route('participant.mark-paid', [$patungan->uuid, $participant->uuid]));
        $this->actingAs($organizer)->post(route('participant.mark-paid', [$patungan->uuid, $participant->uuid]));

        $this->assertSame(25000, $patungan->fresh()->collected_amount);
    }

    public function test_another_organizer_cannot_mark_a_participant_paid(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $participant = $patungan->participants->first();

        $this->actingAs($this->organizer())
            ->post(route('participant.mark-paid', [$patungan->uuid, $participant->uuid]))
            ->assertForbidden();

        $this->assertSame(ParticipantStatus::Unpaid, $participant->fresh()->status);
    }

    public function test_a_paid_participant_cannot_be_deleted(): void
    {
        $organizer = $this->organizer();
        $patungan = $this->makePatungan($organizer, ['Andreas', 'Niko']);
        $participant = $patungan->participants->first();

        $this->actingAs($organizer)->post(route('participant.mark-paid', [$patungan->uuid, $participant->uuid]));

        $this->actingAs($organizer)
            ->delete(route('participant.destroy', [$patungan->uuid, $participant->uuid]))
            ->assertSessionHasErrors('participant');

        $this->assertDatabaseHas('patungan_participants', ['id' => $participant->id]);
    }
}
