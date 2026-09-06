<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_the_demo_seeder_refuses_to_run_outside_local_and_testing(): void
    {
        // The seeder creates an admin whose password is in the repository, so
        // running it on a deployed box would give the panel away.
        app()->detectEnvironment(fn () => 'production');

        $this->expectException(RuntimeException::class);

        // Called straight rather than through `db:seed`, which would wrap the
        // failure in a console exception and hide what actually stopped it.
        app()->call([app(DatabaseSeeder::class), 'run']);
    }

    public function test_the_demo_seeder_still_runs_while_testing(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseHas('users', ['email' => 'admin@patungan.test', 'role' => 'ADMIN']);
    }
}
