<?php

namespace Database\Factories;

use App\Enums\ParticipantStatus;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<PatunganParticipant> */
class PatunganParticipantFactory extends Factory
{
    protected $model = PatunganParticipant::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        return [
            'uuid' => (string) Str::uuid(),
            'patungan_id' => Patungan::factory(),
            'name' => $this->faker->firstName(),
            'amount_due' => 25000,
            'amount_paid' => 0,
            'status' => ParticipantStatus::Unpaid,
            'position' => 0,
        ];
    }
}
