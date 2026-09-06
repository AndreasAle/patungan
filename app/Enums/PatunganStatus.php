<?php

namespace App\Enums;

enum PatunganStatus: string
{
    case Draft = 'DRAFT';
    case Active = 'ACTIVE';
    case Completed = 'COMPLETED';
    case Closed = 'CLOSED';
    case Cancelled = 'CANCELLED';

    public function label(): string
    {
        return match ($this) {
            self::Draft => 'Draf',
            self::Active => 'Aktif',
            self::Completed => 'Lunas',
            self::Closed => 'Ditutup',
            self::Cancelled => 'Dibatalkan',
        };
    }

    /** Whether participants may still create payments. */
    public function acceptsPayment(): bool
    {
        return $this === self::Active;
    }

    public function isOpen(): bool
    {
        return in_array($this, [self::Draft, self::Active], true);
    }
}
