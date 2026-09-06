<?php

namespace Tests\Support;

use App\Enums\PatunganCategory;
use App\Enums\SplitType;
use App\Enums\UserRole;
use App\Models\Patungan;
use App\Models\Payment;
use App\Models\User;
use App\Payments\Gateways\SandboxGateway;
use App\Payments\PaymentGatewayManager;
use App\Services\PatunganService;

trait PatunganFixtures
{
    protected function organizer(array $attributes = []): User
    {
        return User::factory()->create($attributes);
    }

    protected function admin(): User
    {
        return User::factory()->create(['role' => UserRole::Admin->value]);
    }

    /** @param  array<int, string>  $names */
    protected function makePatungan(User $organizer, array $names = ['Andreas', 'Niko'], int $amount = 25000): Patungan
    {
        return app(PatunganService::class)->create($organizer, [
            'title' => 'Badminton Minggu Malam',
            'description' => null,
            'category' => PatunganCategory::Olahraga->value,
            'split_type' => SplitType::Equal->value,
            'equal_amount' => $amount,
            'participants' => array_map(fn (string $name) => ['name' => $name], $names),
        ]);
    }

    /**
     * Builds a correctly signed notification for a sandbox invoice, exactly as
     * the provider would send it.
     *
     * @return array<string, mixed>
     */
    protected function webhookPayload(Payment $payment, string $status = 'settlement', ?string $grossAmount = null): array
    {
        /** @var SandboxGateway $gateway */
        $gateway = app(PaymentGatewayManager::class)->driver('sandbox');

        $statusCode = $status === 'settlement' ? '200' : '202';
        $gross = $grossAmount ?? number_format($payment->charged_amount, 2, '.', '');

        return [
            'order_id' => $payment->gateway_reference,
            'transaction_id' => $payment->gateway_transaction_id,
            'status_code' => $statusCode,
            'gross_amount' => $gross,
            'transaction_status' => $status,
            'payment_type' => 'qris',
            'signature_key' => $gateway->signature($payment->gateway_reference, $statusCode, $gross),
        ];
    }
}
