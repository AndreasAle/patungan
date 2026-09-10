<?php

namespace Tests\Feature;

use App\Enums\ParticipantStatus;
use App\Enums\PatunganStatus;
use App\Models\Patungan;
use App\Models\User;
use App\Services\PatunganService;
use App\Support\PatunganShareService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

/**
 * The WhatsApp-first flow, end to end.
 *
 * Two themes run through these: a message must never advertise a figure the
 * database does not hold, and a personal link must never become a way of
 * reading somebody else's bill.
 */
class WhatsAppFirstTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    private PatunganShareService $share;

    protected function setUp(): void
    {
        parent::setUp();

        $this->share = app(PatunganShareService::class);
    }

    private function patungan(array $names = ['Sandi', 'Egik', 'Ook']): Patungan
    {
        return $this->makePatungan($this->organizer(), $names);
    }

    // ---------------------------------------------------------------- links

    public function test_a_public_link_opens_without_logging_in(): void
    {
        $patungan = $this->patungan();

        $this->get($patungan->publicUrl())->assertOk();
    }

    public function test_an_unknown_public_token_is_rejected(): void
    {
        $this->get(route('public.patungan.show', ['token' => 'NOPENOPE']))->assertNotFound();
    }

    public function test_the_public_link_carries_no_database_id(): void
    {
        $patungan = $this->patungan();

        // A sequential id in a shared URL invites somebody to try id + 1.
        $this->assertStringNotContainsString('/'.$patungan->id, $patungan->publicUrl());
        $this->assertMatchesRegularExpression('#/p/[A-Z0-9]{8}$#', $patungan->publicUrl());
    }

    // ------------------------------------------------------- personal links

    public function test_a_personal_link_opens_that_participant_s_own_bill(): void
    {
        $patungan = $this->patungan();
        $sandi = $patungan->participants->firstWhere('name', 'Sandi');

        $this->get($this->share->personalUrl($patungan, $sandi))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('public/personal-pay')
                ->where('participant.name', 'Sandi')
                ->where('participant.amount_due', (int) $sandi->amount_due));
    }

    public function test_a_personal_link_does_not_expose_any_other_participant(): void
    {
        $patungan = $this->patungan(['Sandi', 'Egik', 'Ook']);
        $sandi = $patungan->participants->firstWhere('name', 'Sandi');

        $response = $this->get($this->share->personalUrl($patungan, $sandi));

        // The single most important assertion here: a link sent to one person,
        // forwarded anywhere, must not become a roster of the whole group.
        $response->assertDontSee('Egik', false);
        $response->assertDontSee('Ook', false);
    }

    public function test_a_personal_link_leaks_no_token_and_no_internal_id(): void
    {
        $patungan = $this->patungan();
        $egik = $patungan->participants->firstWhere('name', 'Egik');
        $sandi = $patungan->participants->firstWhere('name', 'Sandi');

        $sandiToken = $sandi->payToken();
        $egikToken = $egik->payToken();

        $content = $this->get($this->share->personalUrl($patungan, $sandi))->getContent();

        // Another participant's credential must not be derivable from this page.
        $this->assertStringNotContainsString($egikToken, $content);
        // Nor should the payload echo back the token that is already in the URL.
        $this->assertStringNotContainsString('"pay_token"', $content);
        $this->assertStringNotContainsString('"organizer_id"', $content);
        $this->assertStringNotContainsString('"'.$sandi->id.'"', $content);
        $this->assertStringNotContainsString($patungan->organizer->email, $content);
        // Guard against the assertion above passing for the wrong reason.
        $this->assertStringContainsString($sandiToken, $this->share->personalUrl($patungan, $sandi));
    }

    public function test_an_invalid_personal_token_shows_a_dead_end_not_a_hint(): void
    {
        $patungan = $this->patungan();

        $this->get(route('public.payment.personal', [$patungan->public_token, 'AAAAAAAAAAAAAAAA']))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('public/personal-invalid'));
    }

    public function test_a_token_from_another_patungan_does_not_resolve(): void
    {
        $mine = $this->patungan();
        $theirs = $this->makePatungan(User::factory()->create(), ['Rahasia']);
        $stranger = $theirs->participants->first();

        // Pairing a real token with the wrong public link must not work.
        $this->get(route('public.payment.personal', [$mine->public_token, $stranger->payToken()]))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('public/personal-invalid'));
    }

    public function test_a_paid_participant_s_personal_link_offers_no_new_payment(): void
    {
        $patungan = $this->patungan();
        $sandi = $patungan->participants->firstWhere('name', 'Sandi');
        $sandi->forceFill(['status' => ParticipantStatus::Paid->value, 'paid_at' => now()])->save();

        $this->get($this->share->personalUrl($patungan, $sandi))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('participant.is_settled', true));

        $this->assertSame(0, $patungan->payments()->count());
    }

    public function test_a_pay_token_is_only_minted_when_somebody_is_chased(): void
    {
        $patungan = $this->patungan();

        $this->assertNull($patungan->participants->first()->pay_token);

        $this->share->personalUrl($patungan, $patungan->participants->first());

        $this->assertNotNull($patungan->participants->first()->refresh()->pay_token);
    }

    public function test_a_personal_link_can_be_rotated_and_revoked(): void
    {
        $participant = $this->patungan()->participants->first();
        $oldToken = $participant->payToken();

        $newToken = $participant->rotatePayToken();

        $this->assertNotSame($oldToken, $newToken);
        $this->assertSame($newToken, $participant->refresh()->pay_token);

        $participant->revokePayToken();

        $this->assertNull($participant->refresh()->pay_token);
    }

    // ------------------------------------------------------------ messages

    public function test_the_group_message_carries_the_public_url_and_real_amount(): void
    {
        $patungan = $this->patungan();

        $message = $this->share->groupInvite($patungan);

        $this->assertStringContainsString($patungan->publicUrl(), $message);
        $this->assertStringContainsString($patungan->title, $message);
        $this->assertStringContainsString('Rp'.number_format((int) $patungan->equal_amount, 0, ',', '.'), $message);
    }

    public function test_the_reminder_lists_only_people_who_have_not_paid(): void
    {
        $patungan = $this->patungan(['Sandi', 'Egik', 'Ook']);
        $patungan->participants->firstWhere('name', 'Egik')
            ->forceFill(['status' => ParticipantStatus::Paid->value, 'paid_at' => now()])->save();

        $message = (string) $this->share->unpaidReminder($patungan->refresh());

        $this->assertStringContainsString('Sandi', $message);
        $this->assertStringContainsString('Ook', $message);
        // Chasing somebody who has already paid is the fastest way to make an
        // organizer stop using the reminder at all.
        $this->assertStringNotContainsString('Egik', $message);
    }

    public function test_the_reminder_is_withheld_entirely_once_everybody_has_paid(): void
    {
        $patungan = $this->patungan(['Sandi']);
        $patungan->participants->first()
            ->forceFill(['status' => ParticipantStatus::Paid->value, 'paid_at' => now()])->save();

        $this->assertNull($this->share->unpaidReminder($patungan->refresh()));
    }

    public function test_progress_uses_the_real_aggregates(): void
    {
        $patungan = $this->patungan(['Sandi', 'Egik']);
        $patungan->forceFill([
            'paid_participant_count' => 1,
            'participant_count' => 2,
            'collected_amount' => 25_000,
            'target_amount' => 50_000,
        ])->save();

        $message = $this->share->progress($patungan->refresh());

        $this->assertStringContainsString('1 orang sudah bayar', $message);
        $this->assertStringContainsString('1 orang belum', $message);
        $this->assertStringContainsString('Rp25.000 / Rp50.000', $message);
    }

    public function test_a_personal_reminder_carries_that_person_s_own_link(): void
    {
        $patungan = $this->patungan();
        $sandi = $patungan->participants->firstWhere('name', 'Sandi');

        $message = $this->share->personalReminder($patungan, $sandi);

        $this->assertStringContainsString($sandi->refresh()->pay_token, $message);
        $this->assertStringContainsString('Sandi', $message);
    }

    public function test_payment_success_message_is_ready_to_share_back_to_the_group(): void
    {
        $patungan = $this->patungan(['Andreas']);
        $andreas = $patungan->participants->first();

        $message = $this->share->paymentSuccess($patungan, $andreas);

        $this->assertStringContainsString('Andreas sudah bayar', $message);
        $this->assertStringContainsString($patungan->title, $message);
    }

    // --------------------------------------------------------- authorisation

    public function test_an_organizer_cannot_mint_a_token_for_someone_else_s_patungan(): void
    {
        $mine = $this->patungan();
        $theirs = $this->makePatungan(User::factory()->create(), ['Rahasia']);

        $this->actingAs($mine->organizer)
            ->post(route('share.personal', [$theirs->uuid, $theirs->participants->first()->uuid]))
            ->assertForbidden();

        $this->assertNull($theirs->participants->first()->refresh()->pay_token);
    }

    public function test_a_participant_from_another_patungan_cannot_be_paired_with_mine(): void
    {
        $mine = $this->patungan();
        $theirs = $this->makePatungan(User::factory()->create(), ['Rahasia']);

        // Both ids are real; only their pairing is a lie.
        $this->actingAs($mine->organizer)
            ->post(route('share.personal', [$mine->uuid, $theirs->participants->first()->uuid]))
            ->assertNotFound();
    }

    public function test_share_actions_require_signing_in(): void
    {
        $patungan = $this->patungan();

        $this->post(route('share.record', $patungan->uuid), ['type' => 'GROUP_INVITE'])->assertRedirect();
    }

    public function test_copying_a_link_records_the_internal_copy_event(): void
    {
        $patungan = $this->patungan();

        $this->actingAs($patungan->organizer)
            ->postJson(route('share.record', $patungan->uuid), [
                'type' => 'GROUP_INVITE',
                'channel' => 'clipboard',
            ])
            ->assertOk();

        $this->assertDatabaseHas('analytics_events', [
            'name' => 'share_link_copied',
            'patungan_id' => $patungan->id,
        ]);
    }

    // -------------------------------------------------------------- repeat

    public function test_repeating_copies_the_people_but_none_of_the_money(): void
    {
        $patungan = $this->patungan(['Sandi', 'Egik']);
        $patungan->participants->first()->forceFill([
            'status' => ParticipantStatus::Paid->value,
            'amount_paid' => 25_000,
            'paid_at' => now(),
            'invoice_number' => 'INV-OLD-1',
        ])->save();
        $patungan->forceFill(['status' => PatunganStatus::Completed->value])->save();

        $fresh = app(PatunganService::class)->repeat($patungan->refresh());

        $this->assertNotSame($patungan->id, $fresh->id);
        $this->assertSame(['Sandi', 'Egik'], $fresh->participants->pluck('name')->all());

        // Nothing that records money having moved may survive the copy.
        foreach ($fresh->participants as $participant) {
            $this->assertSame(ParticipantStatus::Unpaid, $participant->status);
            $this->assertSame(0, (int) $participant->amount_paid);
            $this->assertNull($participant->paid_at);
            $this->assertNull($participant->invoice_number);
            $this->assertNull($participant->pay_token);
        }

        $this->assertSame(0, $fresh->payments()->count());
        $this->assertSame(0, (int) $fresh->collected_amount);
        $this->assertSame(0, (int) $fresh->paid_participant_count);
    }

    public function test_repeating_issues_a_new_public_link(): void
    {
        $patungan = $this->patungan();
        $patungan->forceFill(['status' => PatunganStatus::Completed->value])->save();

        $fresh = app(PatunganService::class)->repeat($patungan->refresh());

        // Reusing the token would mean last week's WhatsApp message silently
        // starts collecting for this week.
        $this->assertNotSame($patungan->public_token, $fresh->public_token);
    }

    public function test_a_live_patungan_cannot_be_repeated(): void
    {
        $patungan = $this->patungan();

        $this->actingAs($patungan->organizer)
            ->post(route('patungan.repeat', $patungan->uuid))
            ->assertRedirect();

        // Two live links for the same thing leaves the group unable to tell
        // which one to pay.
        $this->assertSame(1, Patungan::query()->where('organizer_id', $patungan->organizer_id)->count());
    }

    public function test_repeating_belongs_to_the_original_organizer_only(): void
    {
        $patungan = $this->patungan();
        $patungan->forceFill(['status' => PatunganStatus::Completed->value])->save();

        $this->actingAs(User::factory()->create())
            ->post(route('patungan.repeat', $patungan->uuid))
            ->assertForbidden();
    }

    // ------------------------------------------------------------- creation

    public function test_creating_lands_on_the_share_screen_not_the_admin_view(): void
    {
        $organizer = $this->organizer();

        $response = $this->actingAs($organizer)->post(route('patungan.store'), [
            'title' => 'Badminton Minggu Malam',
            'category' => 'OLAHRAGA',
            'split_type' => 'EQUAL',
            'equal_amount' => 25_000,
            'participants' => collect(range(1, 8))->map(fn (int $i) => ['name' => 'Orang '.$i])->all(),
        ]);

        $patungan = Patungan::query()->where('organizer_id', $organizer->id)->firstOrFail();

        $response->assertRedirect(route('patungan.created', $patungan));

        $this->actingAs($organizer)->get(route('patungan.created', $patungan))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('patungan/created')
                ->where('patungan.participant_count', 8)
                ->where('share.public_url', $patungan->publicUrl()));
    }

    // ------------------------------------------------------------ previews

    public function test_a_shared_link_previews_as_itself_not_as_the_homepage(): void
    {
        $patungan = $this->patungan();

        $content = $this->get($patungan->publicUrl())->getContent();

        $this->assertStringContainsString('property="og:title"', $content);
        $this->assertStringContainsString($patungan->title, $content);
        $this->assertStringContainsString(route('public.patungan.share-image', ['token' => $patungan->public_token]), $content);
    }

    public function test_a_private_room_preview_gives_nothing_away(): void
    {
        $patungan = $this->patungan();
        $patungan->forceFill(['privacy_mode' => 'PRIVATE_ROOM'])->save();

        $content = $this->get($patungan->publicUrl())->getContent();

        // A private room's whole premise is that a vendor learns only about
        // their own bill; a preview announcing the group's progress from the
        // outside would undo that.
        $this->assertStringNotContainsString('sudah bayar', $content);
    }

    public function test_the_share_image_endpoint_answers_with_an_image(): void
    {
        $patungan = $this->patungan();

        $response = $this->get(route('public.patungan.share-image', ['token' => $patungan->public_token]));

        // On a host with no usable font this redirects to the static card
        // rather than returning something broken.
        $this->assertContains($response->getStatusCode(), [200, 302]);

        if ($response->getStatusCode() === 200) {
            $this->assertSame('image/png', $response->headers->get('Content-Type'));
        }
    }
}
