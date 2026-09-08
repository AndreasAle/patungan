<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PromoteUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_grants_the_admin_role(): void
    {
        $user = User::factory()->create(['email' => 'someone@example.com']);

        $this->artisan('user:promote', ['email' => 'someone@example.com', '--force' => true])
            ->assertSuccessful();

        $this->assertSame(UserRole::Admin, $user->fresh()->role);
    }

    public function test_it_takes_the_admin_role_away_again(): void
    {
        $user = User::factory()->create(['email' => 'someone@example.com', 'role' => UserRole::Admin->value]);

        $this->artisan('user:promote', ['email' => 'someone@example.com', '--demote' => true, '--force' => true])
            ->assertSuccessful();

        $this->assertSame(UserRole::Organizer, $user->fresh()->role);
    }

    public function test_an_unknown_address_fails_rather_than_creating_an_account(): void
    {
        $this->artisan('user:promote', ['email' => 'nobody@example.com', '--force' => true])
            ->assertFailed();

        $this->assertSame(0, User::query()->count());
    }

    public function test_promoting_an_admin_again_changes_nothing(): void
    {
        $user = User::factory()->create(['email' => 'someone@example.com', 'role' => UserRole::Admin->value]);

        $this->artisan('user:promote', ['email' => 'someone@example.com', '--force' => true])
            ->assertSuccessful();

        $this->assertSame(UserRole::Admin, $user->fresh()->role);
    }

    public function test_it_only_touches_the_account_named(): void
    {
        $target = User::factory()->create(['email' => 'target@example.com']);
        $other = User::factory()->create(['email' => 'other@example.com']);

        $this->artisan('user:promote', ['email' => 'target@example.com', '--force' => true])->assertSuccessful();

        $this->assertSame(UserRole::Admin, $target->fresh()->role);
        $this->assertSame(UserRole::Organizer, $other->fresh()->role);
    }
}
