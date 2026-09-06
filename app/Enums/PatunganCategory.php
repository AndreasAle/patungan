<?php

namespace App\Enums;

enum PatunganCategory: string
{
    case Olahraga = 'OLAHRAGA';
    case Makan = 'MAKAN';
    case Nongkrong = 'NONGKRONG';
    case Trip = 'TRIP';
    case Villa = 'VILLA';
    case Kado = 'KADO';
    case Acara = 'ACARA';
    case Kas = 'KAS';
    case Lainnya = 'LAINNYA';

    public function label(): string
    {
        return match ($this) {
            self::Olahraga => 'Olahraga',
            self::Makan => 'Makan',
            self::Nongkrong => 'Nongkrong',
            self::Trip => 'Trip',
            self::Villa => 'Villa',
            self::Kado => 'Kado',
            self::Acara => 'Acara',
            self::Kas => 'Kas',
            self::Lainnya => 'Lainnya',
        };
    }
}
