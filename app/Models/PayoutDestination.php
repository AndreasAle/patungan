<?php

namespace App\Models;

use App\Enums\PayoutDestinationType;
use App\Models\Concerns\HasUuid;
use Database\Factories\PayoutDestinationFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayoutDestination extends Model
{
    /** @use HasFactory<PayoutDestinationFactory> */
    use HasFactory, HasUuid;

    protected $fillable = [
        'type',
        'provider_code',
        'provider_label',
        'account_number',
        'account_holder',
        'is_default',
    ];

    /** The full account number never leaves the server. */
    protected $hidden = ['account_number'];

    protected function casts(): array
    {
        return [
            'type' => PayoutDestinationType::class,
            'is_default' => 'boolean',
            'verified_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /** e.g. "BCA ****8291" - safe to render anywhere. */
    public function maskedLabel(): string
    {
        return $this->provider_label.' '.$this->maskedAccountNumber();
    }

    public function maskedAccountNumber(): string
    {
        $number = $this->account_number ?? '';
        $tail = substr($number, -4);

        return str_repeat('*', max(strlen($number) - 4, 0)).$tail;
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
