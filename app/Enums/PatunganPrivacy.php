<?php

namespace App\Enums;

enum PatunganPrivacy: string
{
    /** One shared link; everyone sees the whole list and the running total. */
    case Open = 'OPEN';

    /**
     * One link, but each participant unlocks it with their own PIN and only
     * ever sees their own bill. Built for vendors who must not see each
     * other's numbers.
     */
    case PrivateRoom = 'PRIVATE_ROOM';

    public function label(): string
    {
        return match ($this) {
            self::Open => 'Link terbuka',
            self::PrivateRoom => 'Private room',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Open => 'Semua yang punya link bisa lihat daftar peserta dan total terkumpul.',
            self::PrivateRoom => 'Tiap peserta punya PIN sendiri dan cuma lihat tagihannya. Cocok buat vendor.',
        };
    }

    public function requiresPin(): bool
    {
        return $this === self::PrivateRoom;
    }
}
