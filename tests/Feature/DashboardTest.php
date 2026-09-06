<?php

namespace Tests\Feature;

use App\Enums\ParticipantStatus;
use App\Enums\PatunganStatus;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $this->actingAs($user = User::factory()->create());

        $this->get('/dashboard')->assertOk();
    }

    public function test_the_summary_counts_every_patungan_not_only_the_listed_ones(): void
    {
        $user = User::factory()->create();
        Patungan::factory()->count(12)->create(['organizer_id' => $user->id]);

        $this->actingAs($user)->get('/dashboard')->assertInertia(
            fn ($page) => $page
                // The list is capped, the headline number must not be.
                ->has('active', 10)
                ->where('stats.active_count', 12)
        );
    }

    public function test_the_summary_counts_only_people_who_still_owe(): void
    {
        $user = User::factory()->create();
        $patungan = Patungan::factory()->create(['organizer_id' => $user->id]);

        foreach ([ParticipantStatus::Unpaid, ParticipantStatus::Pending, ParticipantStatus::Paid, ParticipantStatus::Waived] as $status) {
            PatunganParticipant::factory()->create(['patungan_id' => $patungan->id, 'status' => $status]);
        }

        $this->actingAs($user)->get('/dashboard')->assertInertia(
            fn ($page) => $page->where('stats.awaiting_count', 2)
        );
    }

    public function test_the_summary_leaves_out_patungan_that_are_no_longer_collecting(): void
    {
        $user = User::factory()->create();
        $closed = Patungan::factory()->closed()->create(['organizer_id' => $user->id]);
        PatunganParticipant::factory()->create(['patungan_id' => $closed->id, 'status' => ParticipantStatus::Unpaid]);

        $this->actingAs($user)->get('/dashboard')->assertInertia(
            fn ($page) => $page
                ->where('stats.active_count', 0)
                ->where('stats.awaiting_count', 0)
        );
    }

    public function test_the_summary_never_counts_another_organizers_rows(): void
    {
        $mine = User::factory()->create();
        $theirs = User::factory()->create();

        $hers = Patungan::factory()->create(['organizer_id' => $theirs->id, 'status' => PatunganStatus::Active]);
        PatunganParticipant::factory()->count(3)->create(['patungan_id' => $hers->id, 'status' => ParticipantStatus::Unpaid]);

        $this->actingAs($mine)->get('/dashboard')->assertInertia(
            fn ($page) => $page
                ->where('stats.active_count', 0)
                ->where('stats.awaiting_count', 0)
                ->where('stats.collected_this_month', 0)
        );
    }
}
