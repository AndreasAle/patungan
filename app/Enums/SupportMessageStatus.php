<?php

namespace App\Enums;

enum SupportMessageStatus: string
{
    case New = 'NEW';
    case Read = 'READ';
    case Replied = 'REPLIED';
    case Closed = 'CLOSED';

    public function label(): string
    {
        return match ($this) {
            self::New => 'Baru',
            self::Read => 'Dibaca',
            self::Replied => 'Sudah dibalas',
            self::Closed => 'Ditutup',
        };
    }
}
