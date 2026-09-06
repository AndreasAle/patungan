<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    use RefreshDatabase;

    private function configureGoogle(): void
    {
        config([
            'services.google.client_id' => 'test-client-id',
            'services.google.client_secret' => 'test-client-secret',
            'services.google.redirect' => 'http://localhost/auth/google/callback',
        ]);
    }

    private function fakeGoogleUser(string $id, string $email, string $name = 'Andreas'): void
    {
        $account = Mockery::mock(SocialiteUser::class);
        $account->shouldReceive('getId')->andReturn($id);
        $account->shouldReceive('getEmail')->andReturn($email);
        $account->shouldReceive('getName')->andReturn($name);
        $account->shouldReceive('getAvatar')->andReturn('https://example.test/avatar.png');

        $provider = Mockery::mock('Laravel\Socialite\Two\GoogleProvider');
        $provider->shouldReceive('user')->andReturn($account);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    public function test_the_routes_are_hidden_until_credentials_are_configured(): void
    {
        config(['services.google.client_id' => null, 'services.google.client_secret' => null]);

        $this->get(route('google.redirect'))->assertNotFound();
        $this->get(route('google.callback'))->assertNotFound();
    }

    public function test_the_login_page_only_advertises_google_when_it_is_configured(): void
    {
        config(['services.google.client_id' => null, 'services.google.client_secret' => null]);

        $this->get(route('login'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('oauth.google', false));

        $this->configureGoogle();

        $this->get(route('login'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->where('oauth.google', true));
    }

    public function test_a_first_time_google_user_gets_an_account(): void
    {
        $this->configureGoogle();
        $this->fakeGoogleUser('google-123', 'baru@gmail.com', 'Andreas Baru');

        $this->get(route('google.callback'))->assertRedirect(route('dashboard'));

        $user = User::query()->where('email', 'baru@gmail.com')->firstOrFail();

        $this->assertSame('google-123', $user->google_id);
        $this->assertSame('Andreas Baru', $user->name);
        // Google already verified the address, and no password is set.
        $this->assertNotNull($user->email_verified_at);
        $this->assertFalse($user->hasPassword());
        $this->assertAuthenticatedAs($user);
    }

    public function test_signing_in_with_google_links_an_existing_email_account(): void
    {
        $this->configureGoogle();
        $existing = User::factory()->create(['email' => 'lama@gmail.com', 'name' => 'Andreas Lama']);

        $this->fakeGoogleUser('google-456', 'lama@gmail.com');

        $this->get(route('google.callback'))->assertRedirect(route('dashboard'));

        $existing->refresh();

        $this->assertSame('google-456', $existing->google_id);
        // The account is linked, not duplicated, and the password still works.
        $this->assertSame(1, User::query()->where('email', 'lama@gmail.com')->count());
        $this->assertTrue($existing->hasPassword());
        $this->assertAuthenticatedAs($existing);
    }

    public function test_returning_google_users_reuse_the_same_account(): void
    {
        $this->configureGoogle();
        $this->fakeGoogleUser('google-789', 'balik@gmail.com');

        $this->get(route('google.callback'));
        $this->post(route('logout'));
        $this->get(route('google.callback'));

        $this->assertSame(1, User::query()->count());
    }

    public function test_a_suspended_account_cannot_sign_in_with_google(): void
    {
        $this->configureGoogle();
        User::factory()->create(['email' => 'beku@gmail.com', 'suspended_at' => now()]);

        $this->fakeGoogleUser('google-999', 'beku@gmail.com');

        $this->get(route('google.callback'))->assertRedirect(route('login'));

        $this->assertGuest();
    }

    public function test_a_google_only_account_cannot_be_logged_into_with_a_blank_password(): void
    {
        $user = User::factory()->create(['email' => 'nopass@gmail.com']);
        $user->forceFill(['password' => null, 'google_id' => 'google-000'])->save();

        $this->post(route('login'), ['email' => 'nopass@gmail.com', 'password' => ''])->assertSessionHasErrors();
        $this->assertGuest();

        $this->post(route('login'), ['email' => 'nopass@gmail.com', 'password' => 'anything'])->assertSessionHasErrors();
        $this->assertGuest();
    }
}
