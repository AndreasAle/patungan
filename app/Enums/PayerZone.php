<?php

namespace App\Enums;

/**
 * Where a payer was when they opened the QRIS, at the coarsest useful grain.
 *
 * This is Indonesia's three time zones, not provinces and not islands. It is
 * derived from the IANA timezone the payer's own browser reports, which is the
 * only location signal this application has: payments never carry a raw IP
 * address, and asking a payer where they live in the middle of a checkout would
 * cost more conversions than the answer is worth.
 *
 * That means Sumatera and Jawa share one bucket. It is a real limitation, not a
 * rounding error, and the dashboard says so rather than implying a precision we
 * do not have. Swapping in a province-level resolver later only changes how this
 * value is produced, not the column or anything reading it.
 */
enum PayerZone: string
{
    case Wib = 'WIB';

    case Wita = 'WITA';

    case Wit = 'WIT';

    /** A timezone outside Indonesia - an overseas payer, or a spoofed clock. */
    case Overseas = 'LN';

    public function label(): string
    {
        return match ($this) {
            self::Wib => 'WIB',
            self::Wita => 'WITA',
            self::Wit => 'WIT',
            self::Overseas => 'Luar negeri',
        };
    }

    /** The islands a reader will actually recognise, for the legend. */
    public function islands(): string
    {
        return match ($this) {
            self::Wib => 'Sumatera, Jawa, Kalimantan Barat & Tengah',
            self::Wita => 'Bali, Nusa Tenggara, Sulawesi, Kalimantan Selatan, Timur & Utara',
            self::Wit => 'Maluku, Papua',
            self::Overseas => 'Di luar Indonesia',
        };
    }

    /**
     * IANA timezones that mean each zone.
     *
     * Indonesia has four canonical identifiers, not three: Asia/Pontianak is
     * WIB alongside Asia/Jakarta. Leaving it out would file every payer in West
     * Kalimantan as overseas.
     *
     * @return array<string, self>
     */
    public static function timezoneMap(): array
    {
        return [
            'asia/jakarta' => self::Wib,
            'asia/pontianak' => self::Wib,
            'asia/makassar' => self::Wita,
            'asia/jayapura' => self::Wit,
        ];
    }

    /** @return list<self> West to east, which is how the map is drawn. */
    public static function indonesian(): array
    {
        return [self::Wib, self::Wita, self::Wit];
    }
}
