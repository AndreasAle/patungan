<?php

namespace App\Enums;

enum PayoutDestinationType: string
{
    case Bank = 'BANK';
    case EWallet = 'EWALLET';

    public function label(): string
    {
        return match ($this) {
            self::Bank => 'Rekening bank',
            self::EWallet => 'E-wallet',
        };
    }
}
