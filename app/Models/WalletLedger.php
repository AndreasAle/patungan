<?php

namespace App\Models;

use App\Enums\LedgerDirection;
use App\Enums\LedgerType;
use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletLedger extends Model
{
    use HasUuid;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'type' => LedgerType::class,
            'direction' => LedgerDirection::class,
            'amount' => 'integer',
            'balance_after' => 'integer',
            'metadata' => 'array',
        ];
    }

    /** Signed contribution of this entry to the organizer balance. */
    public function signedAmount(): int
    {
        return $this->direction->sign() * $this->amount;
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return BelongsTo<Patungan, $this> */
    public function patungan(): BelongsTo
    {
        return $this->belongsTo(Patungan::class);
    }

    /** @return BelongsTo<Payment, $this> */
    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class);
    }

    /** @return BelongsTo<Settlement, $this> */
    public function settlement(): BelongsTo
    {
        return $this->belongsTo(Settlement::class);
    }
}
