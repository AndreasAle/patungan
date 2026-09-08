<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Console\ConfirmableTrait;

/**
 * Grants or removes the admin role.
 *
 * An admin sees every organizer's transactions, payouts and support messages,
 * so this is not something to do with a pasted tinker block at 2am. In
 * production it asks first, and it always reports what the role was before.
 */
class PromoteUser extends Command
{
    use ConfirmableTrait;

    protected $signature = 'user:promote
        {email : The account to change}
        {--demote : Take the admin role away instead of granting it}
        {--force : Skip the confirmation prompt}';

    protected $description = 'Grant or remove the admin role for one account';

    public function handle(): int
    {
        $email = (string) $this->argument('email');
        $demote = (bool) $this->option('demote');

        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $this->components->error("No account with the email {$email}.");
            $this->line('  <fg=gray>Check the address, or list accounts with: php artisan user:promote --help</>');

            return self::FAILURE;
        }

        $target = $demote ? UserRole::Organizer : UserRole::Admin;

        if ($user->role === $target) {
            $this->components->info("{$email} is already {$target->value}. Nothing to do.");

            return self::SUCCESS;
        }

        $this->components->twoColumnDetail('Account', $email);
        $this->components->twoColumnDetail('Name', $user->name);
        $this->components->twoColumnDetail('Role now', $user->role->value);
        $this->components->twoColumnDetail('Role after', "<fg=yellow>{$target->value}</>");

        if (! $demote) {
            $this->newLine();
            $this->line('  <fg=gray>An admin can see every organizer\'s patungan, payments, payouts and</>');
            $this->line('  <fg=gray>support messages - not only their own.</>');
        }

        // ConfirmableTrait only prompts in production, which is where it matters.
        if (! $this->confirmToProceed()) {
            return self::FAILURE;
        }

        $before = $user->role->value;
        $user->forceFill(['role' => $target->value])->save();

        $this->components->info("{$email}: {$before} -> {$user->fresh()->role->value}");

        return self::SUCCESS;
    }
}
