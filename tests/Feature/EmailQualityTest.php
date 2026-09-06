<?php

namespace Tests\Feature;

use App\Contracts\DnsResolver;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailQualityTest extends TestCase
{
    use RefreshDatabase;

    /** Pretends only the listed domains publish a mail server. */
    private function dnsKnows(string ...$domains): void
    {
        $this->app->bind(DnsResolver::class, fn () => new class($domains) implements DnsResolver
        {
            /** @param array<int, string> $domains */
            public function __construct(private readonly array $domains) {}

            public function acceptsMail(string $domain): bool
            {
                return in_array(strtolower($domain), $this->domains, true);
            }
        });
    }

    /** @return array<string, string> */
    private function payload(string $email): array
    {
        return [
            'name' => 'Andreas',
            'email' => $email,
            'password' => 'kata-sandi-panjang',
            'password_confirmation' => 'kata-sandi-panjang',
        ];
    }

    public function test_a_domain_that_cannot_receive_mail_is_refused(): void
    {
        $this->dnsKnows('gmail.com');

        $this->post(route('register'), $this->payload('andreas@gmial.com'))->assertSessionHasErrors('email');
        $this->post(route('register'), $this->payload('andreas@asdkjhasd.xyz'))->assertSessionHasErrors('email');

        $this->assertSame(0, User::query()->count());
        $this->assertGuest();
    }

    public function test_a_real_domain_is_accepted(): void
    {
        $this->dnsKnows('gmail.com');

        $this->post(route('register'), $this->payload('andreas@gmail.com'))->assertSessionHasNoErrors();

        $this->assertSame(1, User::query()->where('email', 'andreas@gmail.com')->count());
    }

    public function test_disposable_inboxes_are_refused(): void
    {
        // The domain resolves fine; it is refused for being throwaway.
        $this->dnsKnows('mailinator.com', 'yopmail.com', 'team.mailinator.com');

        $this->post(route('register'), $this->payload('andreas@mailinator.com'))->assertSessionHasErrors('email');
        $this->post(route('register'), $this->payload('andreas@yopmail.com'))->assertSessionHasErrors('email');
        // Subdomains of a blocked domain count too.
        $this->post(route('register'), $this->payload('andreas@team.mailinator.com'))->assertSessionHasErrors('email');

        $this->assertSame(0, User::query()->count());
    }

    public function test_a_malformed_address_is_refused_before_any_lookup(): void
    {
        $this->dnsKnows('gmail.com');

        $this->post(route('register'), $this->payload('bukan-email'))->assertSessionHasErrors('email');
        $this->post(route('register'), $this->payload('andreas@'))->assertSessionHasErrors('email');
    }

    public function test_registering_sends_a_verification_link_and_holds_the_account_back(): void
    {
        Notification::fake();
        $this->dnsKnows('gmail.com');

        $this->post(route('register'), $this->payload('andreas@gmail.com'))
            ->assertRedirect(route('verification.notice'));

        $user = User::query()->firstOrFail();

        $this->assertNull($user->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);

        // Signed in, but nothing is usable until the link is clicked.
        $this->get(route('dashboard'))->assertRedirect(route('verification.notice'));
        $this->get(route('patungan.create'))->assertRedirect(route('verification.notice'));
    }

    public function test_a_verified_account_reaches_the_dashboard(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();
    }

    public function test_changing_the_profile_email_is_held_to_the_same_rules(): void
    {
        $this->dnsKnows('gmail.com');
        $user = User::factory()->create(['email' => 'lama@gmail.com']);

        $this->actingAs($user)->patch(route('profile.update'), ['name' => 'Andreas', 'email' => 'andreas@gmial.com'])
            ->assertSessionHasErrors('email');

        $this->actingAs($user)->patch(route('profile.update'), ['name' => 'Andreas', 'email' => 'andreas@mailinator.com'])
            ->assertSessionHasErrors('email');

        $this->assertSame('lama@gmail.com', $user->fresh()->email);
    }

    public function test_signing_in_with_google_needs_no_verification_step(): void
    {
        $user = User::factory()->create(['email_verified_at' => null]);
        $user->forceFill(['google_id' => 'google-1', 'email_verified_at' => now()])->save();

        $this->actingAs($user)->get(route('dashboard'))->assertOk();
    }
}
