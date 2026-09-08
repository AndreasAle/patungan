<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Creates an admin account from the command line.
 *
 * The seeder cannot do this - it refuses to run outside local, because it
 * plants a password that is written in the repository. So the only honest way
 * to get a first administrator onto a live box is to type one in here.
 *
 * The password is never a command argument. Arguments end up in shell history
 * and in the process list, where any other user on the box can read them; it is
 * prompted for instead, or generated and shown once.
 */
class MakeAdminUser extends Command
{
    use ConfirmableTrait;

    /** Matches Password::defaults(), which is what registration enforces. */
    private const MINIMUM_PASSWORD = 8;

    protected $signature = 'user:make-admin
        {email : The address for the new administrator}
        {--name= : Display name, asked for if omitted}
        {--generate : Generate a strong password and print it once instead of prompting}
        {--force : Skip the confirmation prompt}';

    protected $description = 'Create a new account with the admin role';

    public function handle(): int
    {
        $email = trim((string) $this->argument('email'));

        if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
            $this->components->error("{$email} is not a valid email address.");

            return self::FAILURE;
        }

        if (User::query()->where('email', $email)->exists()) {
            $this->components->error("An account with {$email} already exists.");
            $this->line("  <fg=gray>To give it the admin role instead: php artisan user:promote {$email}</>");

            return self::FAILURE;
        }

        $name = (string) ($this->option('name') ?: $this->ask('Display name'));

        if (trim($name) === '') {
            $this->components->error('A display name is required.');

            return self::FAILURE;
        }

        $password = $this->option('generate') ? Str::password(20) : $this->askForPassword();

        if ($password === null) {
            return self::FAILURE;
        }

        $this->newLine();
        $this->components->twoColumnDetail('Email', $email);
        $this->components->twoColumnDetail('Name', $name);
        $this->components->twoColumnDetail('Role', '<fg=yellow>'.UserRole::Admin->value.'</>');
        $this->newLine();
        $this->line('  <fg=gray>An admin can see every organizer\'s patungan, payments, payouts and</>');
        $this->line('  <fg=gray>support messages - not only their own.</>');

        if (! $this->confirmToProceed()) {
            return self::FAILURE;
        }

        $user = new User;
        $user->forceFill([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
            'role' => UserRole::Admin->value,
            /*
             * Verified on creation. The address was typed by whoever has shell
             * access to the server, so a verification email would be a loop
             * with no one on the other end of it.
             */
            'email_verified_at' => now(),
        ])->save();

        $this->newLine();
        $this->components->info("Admin account created for {$email}.");

        if ($this->option('generate')) {
            $this->newLine();
            $this->line('  <fg=yellow>Password (shown once):</> '.$password);
            $this->line('  <fg=gray>Save it in a password manager now, then clear your terminal.</>');
        }

        return self::SUCCESS;
    }

    /** Asks twice, in secret, and refuses anything registration would refuse. */
    private function askForPassword(): ?string
    {
        $password = (string) $this->secret('Password (tidak ditampilkan)');

        if (strlen($password) < self::MINIMUM_PASSWORD) {
            $this->components->error('Password must be at least '.self::MINIMUM_PASSWORD.' characters.');

            return null;
        }

        if ($password !== (string) $this->secret('Repeat password')) {
            $this->components->error('The two passwords do not match.');

            return null;
        }

        return $password;
    }
}
