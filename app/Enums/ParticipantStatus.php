<?php

namespace App\Enums;

enum ParticipantStatus: string
{
    case Unpaid = 'UNPAID';
    case Pending = 'PENDING';
    case Paid = 'PAID';
    case Waived = 'WAIVED';
    case Refunded = 'REFUNDED';

    public function label(): string
    {
        return match ($this) {
            self::Unpaid => 'Belum bayar',
            self::Pending => 'Menunggu pembayaran',
            self::Paid => 'Sudah bayar',
            self::Waived => 'Dibebaskan',
            self::Refunded => 'Dikembalikan',
        };
    }

    /** Statuses that no longer owe money to the patungan. */
    public function isSettled(): bool
    {
        return in_array($this, [self::Paid, self::Waived], true);
    }

    public function canStartPayment(): bool
    {
        return in_array($this, [self::Unpaid, self::Pending], true);
    }
}
