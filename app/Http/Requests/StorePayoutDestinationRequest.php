<?php

namespace App\Http\Requests;

use App\Enums\PayoutDestinationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePayoutDestinationRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(PayoutDestinationType::class)],
            'provider_code' => ['required', 'string', 'max:40'],
            'account_number' => ['required', 'string', 'max:40', 'regex:/^[0-9]+$/'],
            'account_holder' => ['required', 'string', 'max:80'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'account_number.regex' => 'Nomor rekening hanya boleh berisi angka.',
            'account_holder.required' => 'Nama pemilik rekening wajib diisi.',
        ];
    }
}
