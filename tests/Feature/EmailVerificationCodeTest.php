<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\VerifyEmailWithCode;
use App\Services\EmailVerificationCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailVerificationCodeTest extends TestCase
{
    use RefreshDatabase;

    /** Issues a real code and hands back the plain digits the email would carry. */
    private function issueCodeFor(User $user): string
    {
        $captured = null;
        Notification::fake();

        app(EmailVerificationCode::class)->send($user);

        Notification::assertSentTo($user, VerifyEmailWithCode::class, function ($notification) use (&$captured) {
            $captured = (new \ReflectionProperty($notification, 'code'))->getValue($notification);

            return true;
        });

        return $captured;
    }

    private function unverified(): User
    {
        return User::factory()->create(['email_verified_at' => null]);
    }

    public function test_the_code_is_six_digits_and_stored_hashed(): void
    {
        $user = $this->unverified();
        $code = $this->issueCodeFor($user);

        $this->assertMatchesRegularExpression('/^\d{6}$/', $code);

        $user->refresh();
        // Never stored in the clear.
        $this->assertNotSame($code, $user->email_verification_code);
        $this->assertTrue(Hash::check($code, $user->email_verification_code));
    }

    public function test_the_right_code_verifies_the_account(): void
    {
        $user = $this->unverified();
        $code = $this->issueCodeFor($user);

        $this->actingAs($user)->post(route('verification.confirm'), ['code' => $code])
            ->assertRedirect(route('dashboard'));

        $user->refresh();

        $this->assertNotNull($user->email_verified_at);
        // The used code is cleared, so it cannot be replayed.
        $this->assertNull($user->email_verification_code);

        $this->actingAs($user)->get(route('dashboard'))->assertOk();
    }

    public function test_a_wrong_code_is_refused_and_counts_against_the_attempts(): void
    {
        $user = $this->unverified();
        $this->issueCodeFor($user);

        $this->actingAs($user)->post(route('verification.confirm'), ['code' => '000000'])
            ->assertSessionHasErrors('code');

        $this->assertNull($user->fresh()->email_verified_at);
        $this->assertSame(1, $user->fresh()->email_verification_attempts);
    }

    public function test_guessing_is_cut_off_after_a_handful_of_tries(): void
    {
        $user = $this->unverified();
        $code = $this->issueCodeFor($user);

        for ($attempt = 0; $attempt < EmailVerificationCode::MAX_ATTEMPTS; $attempt++) {
            $this->actingAs($user)->post(route('verification.confirm'), ['code' => '000000']);
        }

        // Even the correct code is refused once the budget is spent.
        $this->actingAs($user)->post(route('verification.confirm'), ['code' => $code])
            ->assertSessionHasErrors('code');

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_an_expired_code_is_refused(): void
    {
        $user = $this->unverified();
        $code = $this->issueCodeFor($user);

        $user->forceFill(['email_verification_expires_at' => now()->subMinute()])->save();

        $this->actingAs($user)->post(route('verification.confirm'), ['code' => $code])
            ->assertSessionHasErrors('code');

        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_one_users_code_does_not_work_for_another(): void
    {
        $mine = $this->unverified();
        $theirs = $this->unverified();

        $code = $this->issueCodeFor($theirs);
        $this->issueCodeFor($mine);

        $this->actingAs($mine)->post(route('verification.confirm'), ['code' => $code])
            ->assertSessionHasErrors('code');

        $this->assertNull($mine->fresh()->email_verified_at);
    }

    public function test_resending_is_held_back_by_a_cooldown(): void
    {
        Notification::fake();
        $user = $this->unverified();

        $this->actingAs($user)->post(route('verification.send'))->assertSessionHas('status', 'verification-code-sent');

        // Straight away again is refused.
        $this->actingAs($user)->post(route('verification.send'))->assertSessionHasErrors('code');

        $this->travel(EmailVerificationCode::RESEND_SECONDS + 1)->seconds();

        $this->actingAs($user)->post(route('verification.send'))->assertSessionHas('status', 'verification-code-sent');

        Notification::assertSentToTimes($user, VerifyEmailWithCode::class, 2);
    }

    public function test_resending_replaces_the_previous_code(): void
    {
        $user = $this->unverified();
        $first = $this->issueCodeFor($user);

        $this->travel(EmailVerificationCode::RESEND_SECONDS + 1)->seconds();
        $second = $this->issueCodeFor($user);

        $this->assertNotSame($first, $second);

        $this->actingAs($user)->post(route('verification.confirm'), ['code' => $first])->assertSessionHasErrors('code');
        $this->actingAs($user)->post(route('verification.confirm'), ['code' => $second])->assertRedirect(route('dashboard'));
    }

    public function test_an_already_verified_account_skips_the_screen(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('verification.notice'))->assertRedirect(route('dashboard'));
    }

    public function test_the_email_carries_the_code_and_an_embedded_logo(): void
    {
        $user = $this->unverified();
        $user->forceFill(['name' => 'Andreas'])->save();

        $sent = null;
        Event::listen(MessageSending::class, function ($event) use (&$sent) {
            $sent = $event->message;
        });

        $user->notify(new VerifyEmailWithCode('123456'));

        $body = $sent->getHtmlBody();

        $this->assertStringContainsString('123456', $body);
        $this->assertStringContainsString('Andreas', $body);
        $this->assertStringContainsString('Patungan', $body);
        // The logo travels with the message, so Gmail shows it without
        // needing a public URL - a data: URI would simply be blocked.
        $this->assertStringContainsString('cid:', $body);
        $this->assertStringNotContainsString('data:image', $body);
        $this->assertCount(1, $sent->getAttachments());
    }
}
