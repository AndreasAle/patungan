<?php

namespace Database\Factories;

use App\Enums\NamePrivacy;
use App\Enums\PatunganCategory;
use App\Enums\PatunganStatus;
use App\Enums\SplitType;
use App\Models\Patungan;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/** @extends Factory<Patungan> */
class PatunganFactory extends Factory
{
    protected $model = Patungan::class;

    /** @return array<string, mixed> */
    public function definition(): array
    {
        $title = 'Patungan '.$this->faker->word();

        return [
            'uuid' => (string) Str::uuid(),
            'public_token' => Patungan::generatePublicToken(),
            'slug' => Str::slug($title),
            'organizer_id' => User::factory(),
            'title' => $title,
            'description' => null,
            'category' => PatunganCategory::Olahraga,
            'split_type' => SplitType::Equal,
            'status' => PatunganStatus::Active,
            'name_privacy' => NamePrivacy::Full,
            'currency' => 'IDR',
            'equal_amount' => 25000,
            'target_amount' => 0,
            'collected_amount' => 0,
            'participant_count' => 0,
            'paid_participant_count' => 0,
        ];
    }

    public function closed(): static
    {
        return $this->state(fn () => [
            'status' => PatunganStatus::Closed,
            'closed_at' => now(),
        ]);
    }
}
