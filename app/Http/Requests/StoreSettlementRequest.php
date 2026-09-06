<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSettlementRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'payout_destination_id' => [
                'required',
                // Scoped to the caller, so an id from another organizer cannot be used.
                Rule::exists('payout_destinations', 'id')->where('user_id', $this->user()->id),
            ],
            'amount' => ['required', 'integer', 'min:'.config('patungan.payout.min_amount')],
        ];
    }
}
