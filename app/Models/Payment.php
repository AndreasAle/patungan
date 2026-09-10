<?php

namespace App\Models;

use App\Enums\PayerZone;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasUuid;

    /** Money and status are never mass assignable - they come from the service layer. */
    protected $guarded = ['id'];

    protected $hidden = ['raw_response'];

    protected function casts(): array
    {
        return [
            'status' => PaymentStatus::class,
            'payment_method' => PaymentMethod::class,
            'payer_zone' => PayerZone::class,
            'amount' => 'integer',
            'service_fee' => 'integer',
            'charged_amount' => 'integer',
            'gateway_fee' => 'integer',
            'platform_fee' => 'integer',
            'fee' => 'integer',
            'net_amount' => 'integer',
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'raw_response' => 'array',
        ];
    }

    /** @return BelongsTo<Patungan, $this> */
    public function patungan(): BelongsTo
    {
        return $this->belongsTo(Patungan::class);
    }

    /** @return BelongsTo<PatunganParticipant, $this> */
    public function participant(): BelongsTo
    {
        return $this->belongsTo(PatunganParticipant::class, 'participant_id');
    }

    /** @return BelongsTo<User, $this> */
    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    public function isExpired(): bool
    {
        return $this->status === PaymentStatus::Pending
            && $this->expires_at !== null
            && $this->expires_at->isPast();
    }

    /** @param Builder<Payment> $query */
    public function scopePaid(Builder $query): void
    {
        $query->where('status', PaymentStatus::Paid->value);
    }
}
