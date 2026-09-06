<?php

namespace Database\Factories;

use App\Enums\PayoutDestinationType;
use App\Models\PayoutDestination;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<PayoutDestination> */
class PayoutDestinationFactory extends Factory
{
    protected $model = PayoutDestination::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'user_id' => User::factory(),
            'type' => PayoutDestinationType::Bank,
            'provider_code' => 'bca',
            'provider_label' => 'BCA',
            'account_number' => (string) $this->faker->numerify('##########'),
            'account_holder' => $this->faker->name(),
            'is_default' => true,
        ];
    }
}
