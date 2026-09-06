<?php

namespace Tests\Feature;

use App\Enums\PatunganCategory;
use App\Enums\SplitType;
use App\Models\Patungan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class PatunganManagementTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_organizer_can_create_a_patungan_with_participants(): void
    {
        $organizer = $this->organizer();

        $response = $this->actingAs($organizer)->post(route('patungan.store'), [
            'title' => 'Badminton Minggu Malam',
            'category' => PatunganCategory::Olahraga->value,
            'split_type' => SplitType::Equal->value,
            'equal_amount' => 25000,
            'participants' => array_map(
                fn (string $name) => ['name' => $name],
                ['Andreas', 'Niko', 'Obet', 'Nanda', 'Nopit', 'Sandi', 'Egik', 'Ook'],
            ),
        ]);

        $patungan = Patungan::query()->firstOrFail();

        $response->assertRedirect(route('patungan.show', $patungan));

        $this->assertSame('Badminton Minggu Malam', $patungan->title);
        $this->assertSame(8, $patungan->participant_count);
        $this->assertSame(200000, $patungan->target_amount);
        $this->assertSame(0, $patungan->collected_amount);
        $this->assertCount(8, $patungan->participants);
        // The share token must not be derived from the id.
        $this->assertNotSame((string) $patungan->id, $patungan->public_token);
    }

    public function test_custom_split_stores_a_different_amount_per_participant(): void
    {
        $organizer = $this->organizer();

        $this->actingAs($organizer)->post(route('patungan.store'), [
            'title' => 'Nonton bareng',
            'category' => PatunganCategory::Acara->value,
            'split_type' => SplitType::Custom->value,
            'participants' => [
                ['name' => 'Andreas', 'amount' => 25000],
                ['name' => 'Niko', 'amount' => 25000],
                ['name' => 'Obet', 'amount' => 50000],
            ],
        ])->assertRedirect();

        $patungan = Patungan::query()->firstOrFail();

        $this->assertSame(100000, $patungan->target_amount);
        $this->assertSame([25000, 25000, 50000], $patungan->participants->pluck('amount_due')->all());
    }

    public function test_duplicate_participant_names_stay_distinct_records(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas', 'Andreas']);

        $uuids = $patungan->participants->pluck('uuid');

        $this->assertCount(2, $uuids->unique());
    }

    public function test_organizer_cannot_view_or_edit_another_organizers_patungan(): void
    {
        $patungan = $this->makePatungan($this->organizer());
        $intruder = $this->organizer();

        $this->actingAs($intruder)->get(route('patungan.show', $patungan))->assertForbidden();

        $this->actingAs($intruder)->patch(route('patungan.update', $patungan), [
            'title' => 'Diambil alih',
            'category' => PatunganCategory::Makan->value,
            'name_privacy' => 'FULL',
        ])->assertForbidden();

        $this->assertSame('Badminton Minggu Malam', $patungan->fresh()->title);
    }

    public function test_guests_cannot_reach_the_organizer_dashboard(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }

    public function test_admin_routes_reject_a_regular_user(): void
    {
        $this->actingAs($this->organizer())->get(route('admin.dashboard'))->assertForbidden();
        $this->actingAs($this->organizer())->get(route('admin.payments'))->assertForbidden();

        $this->actingAs($this->admin())->get(route('admin.dashboard'))->assertOk();
    }

    public function test_suspended_organizer_cannot_create_a_patungan(): void
    {
        $suspended = $this->organizer(['suspended_at' => now()]);

        $this->actingAs($suspended)->get(route('patungan.create'))->assertForbidden();
    }
}
