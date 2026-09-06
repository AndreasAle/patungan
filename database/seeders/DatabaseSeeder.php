<?php

namespace Database\Seeders;

use App\Enums\PatunganCategory;
use App\Enums\SplitType;
use App\Enums\UserRole;
use App\Models\PayoutDestination;
use App\Models\User;
use App\Services\PatunganService;
use App\Services\PaymentService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Demo data for local development.
 *
 * Paid participants are seeded by running real invoices through PaymentService
 * and settling them, so balances, the ledger and the aggregates all agree - no
 * hand-written financial numbers.
 */
class DatabaseSeeder extends Seeder
{
    private const PAID = ['Andreas', 'Niko', 'Obet', 'Nopit', 'Ook'];

    public function run(PatunganService $patunganService, PaymentService $paymentService): void
    {
        $admin = User::query()->firstOrCreate(
            ['email' => 'admin@patungan.test'],
            ['name' => 'Admin Patungan', 'password' => Hash::make('password')],
        );
        $admin->forceFill(['role' => UserRole::Admin->value, 'email_verified_at' => now()])->save();

        $organizer = User::query()->firstOrCreate(
            ['email' => 'andreas@patungan.test'],
            ['name' => 'Andreas', 'password' => Hash::make('password')],
        );
        $organizer->forceFill(['role' => UserRole::Organizer->value, 'email_verified_at' => now()])->save();

        if ($organizer->patungans()->exists()) {
            $this->command?->info('Demo data already present - skipping.');

            return;
        }

        PayoutDestination::query()->create([
            'user_id' => $organizer->id,
            'type' => 'BANK',
            'provider_code' => 'bca',
            'provider_label' => 'BCA',
            'account_number' => '1234568291',
            'account_holder' => 'ANDREAS',
            'is_default' => true,
        ]);

        $patungan = $patunganService->create($organizer, [
            'title' => 'Badminton Minggu Malam',
            'description' => 'Sewa lapangan 2 jam + shuttlecock.',
            'category' => PatunganCategory::Olahraga->value,
            'split_type' => SplitType::Equal->value,
            'equal_amount' => 25000,
            'event_date' => now()->next('Sunday')->toDateString(),
            'expires_at' => now()->addDays(3)->toDateTimeString(),
            'participants' => array_map(
                fn (string $name) => ['name' => $name],
                ['Andreas', 'Niko', 'Obet', 'Nanda', 'Nopit', 'Sandi', 'Egik', 'Ook'],
            ),
        ]);

        foreach ($patungan->participants as $participant) {
            if (! in_array($participant->name, self::PAID, true)) {
                continue;
            }

            $payment = $paymentService->createForParticipant($participant);
            $paymentService->markAsPaid($payment, $payment->gateway_transaction_id, $payment->raw_response ?? []);
        }

        $this->command?->info('Seeded: andreas@patungan.test / admin@patungan.test (password: "password").');
    }
}
