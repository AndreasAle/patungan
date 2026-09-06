<?php

namespace App\Http\Requests\Settings;

use App\Models\User;
use App\Rules\NotDisposableEmail;
use App\Rules\RealEmailDomain;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'email.unique' => 'Email ini sudah dipakai akun lain.',
            'email.email' => 'Format emailnya belum benar.',
        ];
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],

            'email' => [
                'required',
                'string',
                'lowercase',
                'email:rfc',
                'max:255',
                app(RealEmailDomain::class),
                new NotDisposableEmail,
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
        ];
    }
}
