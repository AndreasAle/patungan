<?php

namespace App\Enums;

enum SplitType: string
{
    case Equal = 'EQUAL';
    case Custom = 'CUSTOM';

    public function label(): string
    {
        return match ($this) {
            self::Equal => 'Sama rata',
            self::Custom => 'Nominal berbeda',
        };
    }
}
