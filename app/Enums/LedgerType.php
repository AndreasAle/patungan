<?php

namespace App\Enums;

enum LedgerType: string
{
    case PaymentReceived = 'PAYMENT_RECEIVED';
    case PlatformFee = 'PLATFORM_FEE';
    case PaymentGatewayFee = 'PAYMENT_GATEWAY_FEE';
    case Payout = 'PAYOUT';
    case PayoutReversal = 'PAYOUT_REVERSAL';
    case Refund = 'REFUND';
    case Adjustment = 'ADJUSTMENT';

    public function label(): string
    {
        return match ($this) {
            self::PaymentReceived => 'Dana masuk',
            self::PlatformFee => 'Biaya layanan',
            self::PaymentGatewayFee => 'Biaya payment gateway',
            self::Payout => 'Pencairan',
            self::PayoutReversal => 'Pengembalian pencairan',
            self::Refund => 'Pengembalian dana',
            self::Adjustment => 'Penyesuaian',
        };
    }
}
