<?php

namespace App\Support;

use App\Enums\PayoutDestinationType;

/**
 * Banks and e-wallets an organizer can withdraw to. Codes follow the common
 * Indonesian disbursement naming so an automated provider can be wired in later
 * without re-keying existing destinations.
 */
final class PayoutChannels
{
    /** @return array<string, array<int, array{code: string, label: string}>> */
    public static function all(): array
    {
        return [
            PayoutDestinationType::Bank->value => [
                ['code' => 'bca', 'label' => 'BCA'],
                ['code' => 'bni', 'label' => 'BNI'],
                ['code' => 'bri', 'label' => 'BRI'],
                ['code' => 'mandiri', 'label' => 'Mandiri'],
                ['code' => 'bsi', 'label' => 'BSI'],
                ['code' => 'cimb', 'label' => 'CIMB Niaga'],
                ['code' => 'permata', 'label' => 'Permata'],
                ['code' => 'danamon', 'label' => 'Danamon'],
                ['code' => 'jago', 'label' => 'Bank Jago'],
                ['code' => 'seabank', 'label' => 'SeaBank'],
            ],
            PayoutDestinationType::EWallet->value => [
                ['code' => 'gopay', 'label' => 'GoPay'],
                ['code' => 'ovo', 'label' => 'OVO'],
                ['code' => 'dana', 'label' => 'DANA'],
                ['code' => 'shopeepay', 'label' => 'ShopeePay'],
                ['code' => 'linkaja', 'label' => 'LinkAja'],
            ],
        ];
    }

    /** @return array{code: string, label: string}|null */
    public static function find(string $type, string $code): ?array
    {
        foreach (self::all()[$type] ?? [] as $channel) {
            if ($channel['code'] === $code) {
                return $channel;
            }
        }

        return null;
    }
}
