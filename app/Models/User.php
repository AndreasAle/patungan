<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Default attribute values, so a freshly instantiated user always has a role
     * even before it is reloaded from the database.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'role' => UserRole::Organizer->value,
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'suspended_at' => 'datetime',
        ];
    }

    /**
     * Google-only accounts have no password. Returning an empty string keeps
     * the hasher from being handed null, and it can never match a real one.
     */
    public function getAuthPassword(): string
    {
        return $this->password ?? '';
    }

    public function hasPassword(): bool
    {
        return filled($this->password);
    }

    public function isAdmin(): bool
    {
        return $this->role === UserRole::Admin;
    }

    public function isSuspended(): bool
    {
        return $this->suspended_at !== null;
    }

    /** @return HasMany<Patungan, $this> */
    public function patungans(): HasMany
    {
        return $this->hasMany(Patungan::class, 'organizer_id');
    }

    /** @return HasMany<WalletLedger, $this> */
    public function ledgers(): HasMany
    {
        return $this->hasMany(WalletLedger::class);
    }

    /** @return HasMany<Settlement, $this> */
    public function settlements(): HasMany
    {
        return $this->hasMany(Settlement::class, 'organizer_id');
    }

    /** @return HasMany<PayoutDestination, $this> */
    public function payoutDestinations(): HasMany
    {
        return $this->hasMany(PayoutDestination::class);
    }
}
