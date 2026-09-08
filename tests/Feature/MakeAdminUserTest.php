<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MakeAdminUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_verified_admin_account(): void
    {
        $this->artisan('user:make-admin', ['email' => 'ops@example.com', '--name' => 'Ops', '--force' => true])
            ->expectsQuestion('Password (tidak ditampilkan)', 'rahasiakuat12')
            ->expectsQuestion('Repeat password', 'rahasiakuat12')
            ->assertSuccessful();

        $user = User::query()->where('email', 'ops@example.com')->firstOrFail();

        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertSame('Ops', $user->name);
        // Typed in by whoever holds the server; there is nobody to verify it with.
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(Hash::check('rahasiakuat12', $user->password));
    }

    public function test_the_new_admin_can_reach_the_admin_panel(): void
    {
        $this->artisan('user:make-admin', ['email' => 'ops@example.com', '--name' => 'Ops', '--force' => true])
            ->expectsQuestion('Password (tidak ditampilkan)', 'rahasiakuat12')
            ->expectsQuestion('Repeat password', 'rahasiakuat12')
            ->assertSuccessful();

        $this->actingAs(User::query()->where('email', 'ops@example.com')->firstOrFail())
            ->get(route('admin.support'))
            ->assertOk();
    }

    public function test_it_refuses_an_address_that_already_exists(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $this->artisan('user:make-admin', ['email' => 'taken@example.com', '--name' => 'Ops', '--force' => true])
            ->assertFailed();

        $this->assertSame(1, User::query()->where('email', 'taken@example.com')->count());
    }

    public function test_it_refuses_a_malformed_address(): void
    {
        $this->artisan('user:make-admin', ['email' => 'bukan-email', '--name' => 'Ops', '--force' => true])
            ->assertFailed();

        $this->assertSame(0, User::query()->count());
    }

    public function test_a_short_password_is_refused_and_nothing_is_created(): void
    {
        $this->artisan('user:make-admin', ['email' => 'ops@example.com', '--name' => 'Ops', '--force' => true])
            ->expectsQuestion('Password (tidak ditampilkan)', 'pendek')
            ->assertFailed();

        $this->assertSame(0, User::query()->count());
    }

    public function test_mismatched_passwords_create_nothing(): void
    {
        $this->artisan('user:make-admin', ['email' => 'ops@example.com', '--name' => 'Ops', '--force' => true])
            ->expectsQuestion('Password (tidak ditampilkan)', 'rahasiakuat12')
            ->expectsQuestion('Repeat password', 'rahasiakuat34')
            ->assertFailed();

        $this->assertSame(0, User::query()->count());
    }

    public function test_generate_makes_an_account_without_asking_for_a_password(): void
    {
        $this->artisan('user:make-admin', ['email' => 'ops@example.com', '--name' => 'Ops', '--generate' => true, '--force' => true])
            ->assertSuccessful();

        $this->assertSame(UserRole::Admin, User::query()->where('email', 'ops@example.com')->firstOrFail()->role);
    }
}
