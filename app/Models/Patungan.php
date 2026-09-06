<?php

namespace App\Models;

use App\Enums\NamePrivacy;
use App\Enums\PatunganCategory;
use App\Enums\PatunganStatus;
use App\Enums\SplitType;
use App\Models\Concerns\HasUuid;
use Database\Factories\PatunganFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Patungan extends Model
{
    /** @use HasFactory<PatunganFactory> */
    use HasFactory, HasUuid;

    protected $fillable = [
        'title',
        'description',
        'category',
        'split_type',
        'name_privacy',
        'equal_amount',
        'event_date',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'category' => PatunganCategory::class,
            'split_type' => SplitType::class,
            'status' => PatunganStatus::class,
            'name_privacy' => NamePrivacy::class,
            'equal_amount' => 'integer',
            'target_amount' => 'integer',
            'collected_amount' => 'integer',
            'participant_count' => 'integer',
            'paid_participant_count' => 'integer',
            'event_date' => 'date',
            'expires_at' => 'datetime',
            'completed_at' => 'datetime',
            'closed_at' => 'datetime',
        ];
    }

    /** Public share links are addressed by token, never by id. */
    public function getRouteKeyName(): string
    {
        return 'uuid';
    }

    public static function generatePublicToken(): string
    {
        do {
            // Upper-case, unambiguous alphabet - readable when typed by hand.
            $token = substr(str_replace(['0', 'O', 'I', '1', 'L'], '', strtoupper(Str::random(24))), 0, 8);
        } while (strlen($token) < 8 || static::where('public_token', $token)->exists());

        return $token;
    }

    /** True once the organizer's payment deadline has passed. */
    public function hasExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    /**
     * Participants may only pay while the patungan is active and the organizer's
     * deadline has not passed. This is the single gate the payment flow checks.
     */
    public function acceptsPayment(): bool
    {
        return $this->status->acceptsPayment() && ! $this->hasExpired();
    }

    /** Seconds an invoice may live without outliving the patungan deadline. */
    public function invoiceTtl(int $default): int
    {
        if ($this->expires_at === null) {
            return $default;
        }

        return max(60, min($default, (int) now()->diffInSeconds($this->expires_at, false)));
    }

    public function publicUrl(): string
    {
        return route('public.patungan.show', ['token' => $this->public_token]);
    }

    /** @return BelongsTo<User, $this> */
    public function organizer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'organizer_id');
    }

    /** @return HasMany<PatunganParticipant, $this> */
    public function participants(): HasMany
    {
        return $this->hasMany(PatunganParticipant::class)->orderBy('position');
    }

    /** @return HasMany<Payment, $this> */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /** @param Builder<Patungan> $query */
    public function scopeOpen(Builder $query): void
    {
        $query->whereIn('status', [PatunganStatus::Draft->value, PatunganStatus::Active->value]);
    }

    public function displayName(string $name): string
    {
        return $this->name_privacy->apply($name);
    }
}
