<?php

namespace Tests\Feature;

use App\Enums\SupportMessageStatus;
use App\Models\SupportMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PatunganFixtures;
use Tests\TestCase;

class SupportMessageTest extends TestCase
{
    use PatunganFixtures, RefreshDatabase;

    /** @return array<string, string> */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Andreas',
            'contact' => 'andreas@example.com',
            'message' => 'QRIS saya sudah dibayar tapi statusnya belum berubah.',
            'page' => '/p/ABCD1234',
        ], $overrides);
    }

    public function test_anyone_can_leave_a_message_without_an_account(): void
    {
        // The person most likely to need help is a payer, who has no account.
        $this->postJson(route('support.store'), $this->payload())->assertCreated();

        $message = SupportMessage::query()->firstOrFail();

        $this->assertNull($message->user_id);
        $this->assertSame('Andreas', $message->name);
        $this->assertSame(SupportMessageStatus::New, $message->status);
        $this->assertSame('/p/ABCD1234', $message->page);
    }

    public function test_a_signed_in_organizer_is_recorded_against_the_message(): void
    {
        $organizer = $this->organizer();

        $this->actingAs($organizer)->postJson(route('support.store'), $this->payload())->assertCreated();

        $this->assertSame($organizer->id, SupportMessage::query()->firstOrFail()->user_id);
    }

    public function test_a_message_needs_a_name_a_contact_and_something_to_answer(): void
    {
        $this->postJson(route('support.store'), ['name' => '', 'contact' => '', 'message' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'contact', 'message']);

        // Too short to act on is refused with wording that says why.
        $this->postJson(route('support.store'), $this->payload(['message' => 'tolong']))
            ->assertStatus(422)
            ->assertJsonValidationErrors('message');

        $this->assertSame(0, SupportMessage::query()->count());
    }

    public function test_oversized_input_is_refused_rather_than_stored(): void
    {
        $this->postJson(route('support.store'), $this->payload(['message' => str_repeat('a', 2001)]))
            ->assertStatus(422);

        $this->postJson(route('support.store'), $this->payload(['name' => str_repeat('a', 81)]))
            ->assertStatus(422);

        $this->assertSame(0, SupportMessage::query()->count());
    }

    public function test_the_honeypot_field_rejects_a_bot(): void
    {
        // No human sees this field, so anything in it did not come from one.
        $this->postJson(route('support.store'), $this->payload(['website' => 'http://spam.example']))
            ->assertStatus(422);

        $this->assertSame(0, SupportMessage::query()->count());
    }

    public function test_the_endpoint_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson(route('support.store'), $this->payload())->assertCreated();
        }

        // Open to the world, so it cannot be an open drain either.
        $this->postJson(route('support.store'), $this->payload())->assertStatus(429);
    }

    public function test_only_an_admin_can_read_the_messages(): void
    {
        SupportMessage::create($this->payload());

        $this->get(route('admin.support'))->assertRedirect(route('login'));
        $this->actingAs($this->organizer())->get(route('admin.support'))->assertForbidden();
        $this->actingAs($this->admin())->get(route('admin.support'))->assertOk();
    }

    public function test_an_admin_can_move_a_message_along(): void
    {
        $message = SupportMessage::create($this->payload());

        $this->actingAs($this->admin())
            ->post(route('admin.support.update', $message->uuid), ['status' => SupportMessageStatus::Replied->value])
            ->assertRedirect();

        $message->refresh();

        $this->assertSame(SupportMessageStatus::Replied, $message->status);
        $this->assertNotNull($message->replied_at);
        // Reading is implied by acting on it.
        $this->assertNotNull($message->read_at);
    }

    public function test_an_organizer_cannot_change_a_message_status(): void
    {
        $message = SupportMessage::create($this->payload());

        $this->actingAs($this->organizer())
            ->post(route('admin.support.update', $message->uuid), ['status' => SupportMessageStatus::Closed->value])
            ->assertForbidden();

        $this->assertSame(SupportMessageStatus::New, $message->fresh()->status);
    }
}
