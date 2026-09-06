<?php

namespace App\Http\Requests;

use App\Enums\NamePrivacy;
use App\Enums\PatunganCategory;
use App\Enums\PatunganPrivacy;
use App\Enums\SplitType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePatunganRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $min = (int) config('patungan.limits.min_amount');
        $max = (int) config('patungan.limits.max_amount');

        return [
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
            'category' => ['required', Rule::enum(PatunganCategory::class)],
            'event_date' => ['nullable', 'date'],
            'expires_at' => ['nullable', 'date', 'after:now'],
            'name_privacy' => ['nullable', Rule::enum(NamePrivacy::class)],
            'privacy_mode' => ['nullable', Rule::enum(PatunganPrivacy::class)],

            'split_type' => ['required', Rule::enum(SplitType::class)],
            'equal_amount' => [
                Rule::requiredIf(fn () => $this->input('split_type') === SplitType::Equal->value),
                'nullable', 'integer', "min:{$min}", "max:{$max}",
            ],

            'participants' => ['required', 'array', 'min:1', 'max:'.config('patungan.limits.max_participants')],
            'participants.*.name' => ['required', 'string', 'max:80'],
            'participants.*.note' => ['nullable', 'string', 'max:120'],
            'participants.*.amount' => [
                Rule::requiredIf(fn () => $this->input('split_type') === SplitType::Custom->value),
                'nullable', 'integer', "min:{$min}", "max:{$max}",
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'title.required' => 'Judul patungan wajib diisi.',
            'participants.required' => 'Tambahkan minimal satu peserta.',
            'participants.*.name.required' => 'Nama peserta tidak boleh kosong.',
            'equal_amount.required' => 'Masukkan nominal per orang.',
            'expires_at.after' => 'Batas waktu pembayaran harus di masa depan.',
            'participants.*.amount.required' => 'Masukkan nominal untuk setiap peserta.',
        ];
    }
}
