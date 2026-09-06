<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Qris = 'QRIS';
    case Manual = 'MANUAL';

    public function label(): string
    {
        return match ($this) {
            self::Qris => 'QRIS',
            self::Manual => 'Tunai / transfer manual',
        };
    }
}
