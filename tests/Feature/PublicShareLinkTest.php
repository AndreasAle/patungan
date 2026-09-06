<?php

namespace Tests\Feature;

use App\Enums\NamePrivacy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class PublicShareLinkTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    public function test_anyone_can_open_a_valid_share_link_without_logging_in(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas', 'Niko']);

        $this->get(route('public.patungan.show', $patungan->public_token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('public/patungan')
                ->where('patungan.title', 'Badminton Minggu Malam')
                ->has('patungan.participants', 2));
    }

    public function test_an_unknown_token_returns_not_found(): void
    {
        $this->makePatungan($this->organizer());

        $this->get(route('public.patungan.show', 'NOPENOPE'))->assertNotFound();
    }

    public function test_public_payload_never_exposes_organizer_or_gateway_internals(): void
    {
        $organizer = $this->organizer(['email' => 'rahasia@patungan.test']);
        $patungan = $this->makePatungan($organizer);

        $response = $this->get(route('public.patungan.show', $patungan->public_token));

        $response->assertOk();
        $response->assertDontSee('rahasia@patungan.test');
        $response->assertDontSee('gateway_transaction_id');
        $response->assertDontSee('raw_response');
    }

    public function test_masked_privacy_hides_participant_names(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas']);
        $patungan->forceFill(['name_privacy' => NamePrivacy::Masked->value])->save();

        $this->get(route('public.patungan.show', $patungan->public_token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('patungan.participants.0.name', 'A*****s'));
    }

    public function test_status_endpoint_reflects_participant_progress(): void
    {
        $patungan = $this->makePatungan($this->organizer(), ['Andreas', 'Niko']);

        $this->getJson(route('public.patungan.status', $patungan->public_token))
            ->assertOk()
            ->assertJsonPath('participant_count', 2)
            ->assertJsonPath('paid_participant_count', 0);
    }
}
