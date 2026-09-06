<?php

namespace App\Http\Requests;

use App\Enums\SplitType;
use App\Models\Patungan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreParticipantsRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        /** @var Patungan $patungan */
        $patungan = $this->route('patungan');
        $min = (int) config('patungan.limits.min_amount');
        $max = (int) config('patungan.limits.max_amount');
        $needsAmount = $patungan->split_type === SplitType::Custom;

        return [
            'participants' => ['required', 'array', 'min:1', 'max:'.config('patungan.limits.max_participants')],
            'participants.*.name' => ['required', 'string', 'max:80'],
            'participants.*.note' => ['nullable', 'string', 'max:120'],
            'participants.*.amount' => [
                Rule::requiredIf($needsAmount),
                'nullable', 'integer', "min:{$min}", "max:{$max}",
            ],
        ];
    }
}
