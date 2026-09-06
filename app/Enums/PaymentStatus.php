<?php

namespace App\Enums;

enum PaymentStatus: string
{
    case Pending = 'PENDING';
    case Paid = 'PAID';
    case Expired = 'EXPIRED';
    case Failed = 'FAILED';
    case Cancelled = 'CANCELLED';
    case Refunded = 'REFUNDED';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu pembayaran',
            self::Paid => 'Berhasil',
            self::Expired => 'Kedaluwarsa',
            self::Failed => 'Gagal',
            self::Cancelled => 'Dibatalkan',
            self::Refunded => 'Dikembalikan',
        };
    }

    /** A pending payment occupies the participant's single active invoice slot. */
    public function isActive(): bool
    {
        return $this === self::Pending;
    }

    public function isFinal(): bool
    {
        return ! $this->isActive();
    }
}
