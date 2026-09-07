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
        'account_last4',
        'account_holder',
        'is_default',
    ];

    /** The full account number never leaves the server. */
    protected $hidden = ['account_number'];

    protected function casts(): array
    {
        return [
            'type' => PayoutDestinationType::class,
            // Encrypted at rest; the model decrypts only when something asks.
            'account_number' => 'encrypted',
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
        // account_last4 is stored alongside so masking never needs the plaintext.
        $tail = $this->account_last4 ?? substr((string) $this->account_number, -4);

        return str_repeat('*', 6).$tail;
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
