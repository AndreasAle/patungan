<?php

namespace App\Enums;

enum SettlementStatus: string
{
    case Pending = 'PENDING';
    case Processing = 'PROCESSING';
    case Completed = 'COMPLETED';
    case Failed = 'FAILED';
    case Rejected = 'REJECTED';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu diproses',
            self::Processing => 'Sedang diproses',
            self::Completed => 'Berhasil dicairkan',
            self::Failed => 'Gagal',
            self::Rejected => 'Ditolak',
        };
    }

    /** Whether the settlement still holds funds against the organizer balance. */
    public function holdsFunds(): bool
    {
        return in_array($this, [self::Pending, self::Processing, self::Completed], true);
    }
}
