<?php

namespace App\Http\Requests;

use App\Enums\NamePrivacy;
use App\Enums\PatunganCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePatunganRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'category' => ['required', Rule::enum(PatunganCategory::class)],
            'event_date' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date'],
            'name_privacy' => ['required', Rule::enum(NamePrivacy::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'expires_at.date' => 'Batas waktu pembayaran tidak valid.',
        ];
    }
}
