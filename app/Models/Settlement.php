<?php

namespace App\Models;

use App\Enums\PayoutDestinationType;
use App\Enums\SettlementStatus;
use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Settlement extends Model
{
    use HasUuid;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'status' => SettlementStatus::class,
            'destination_type' => PayoutDestinationType::class,
            'amount' => 'integer',
            'fee' => 'integer',
            'net_amount' => 'integer',
            'requested_at' => 'datetime',
            'processed_at' => 'datetime',
            'failed_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    /** @return BelongsTo<Patungan, $this> */
    public function patungan(): BelongsTo
    {
        return $this->belongsTo(Patungan::class);
    }

    /** @return BelongsTo<PayoutDestination, $this> */
    public function destination(): BelongsTo
    {
        return $this->belongsTo(PayoutDestination::class, 'payout_destination_id');
    }
}
