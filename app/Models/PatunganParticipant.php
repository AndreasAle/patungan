<?php

namespace App\Models;

use App\Enums\ParticipantStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Concerns\HasUuid;
use Database\Factories\PatunganParticipantFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class PatunganParticipant extends Model
{
    /** @use HasFactory<PatunganParticipantFactory> */
    use HasFactory, HasUuid;

    protected $fillable = [
        'name',
        'note',
        'amount_due',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'status' => ParticipantStatus::class,
            'paid_method' => PaymentMethod::class,
            'amount_due' => 'integer',
            'amount_paid' => 'integer',
            'position' => 'integer',
            'paid_at' => 'datetime',
            'metadata' => 'array',
            'access_pin' => 'encrypted',
        ];
    }

    /** Never serialise the room PIN or its lookup hash by accident. */
    protected $hidden = ['access_pin', 'access_pin_lookup'];

    public function hasInvoice(): bool
    {
        return $this->invoice_number !== null && $this->status->isSettled();
    }

    /** @return BelongsTo<Patungan, $this> */
    public function patungan(): BelongsTo
    {
        return $this->belongsTo(Patungan::class);
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'participant_id');
    }

    /** @return HasOne<Payment, $this> */
    public function activePayment(): HasOne
    {
        return $this->hasOne(Payment::class, 'participant_id')
            ->where('status', PaymentStatus::Pending->value)
            ->latestOfMany();
    }

    /** @return BelongsTo<User, $this> */
    public function markedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'marked_by_user_id');
    }
}
