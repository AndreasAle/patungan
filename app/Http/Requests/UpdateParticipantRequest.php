<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateParticipantRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:80'],
            'note' => ['nullable', 'string', 'max:120'],
            'amount_due' => [
                'required', 'integer',
                'min:'.config('patungan.limits.min_amount'),
                'max:'.config('patungan.limits.max_amount'),
            ],
        ];
    }
}
