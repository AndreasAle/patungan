<?php

return [
    'currency' => 'IDR',

    /*
    | Payment gateway driver. "midtrans" talks to the real Midtrans Core API
    | (QRIS dynamic). "sandbox" is a local development simulator and must never
    | be enabled in production - see PaymentGatewayManager for the guard.
    */
    'gateway' => env('PAYMENT_GATEWAY', 'sandbox'),

    // Invoice lifetime in seconds.
    'invoice_ttl' => (int) env('PAYMENT_INVOICE_TTL', 900),

    'midtrans' => [
        'server_key' => env('MIDTRANS_SERVER_KEY'),
        'client_key' => env('MIDTRANS_CLIENT_KEY'),
        'merchant_id' => env('MIDTRANS_MERCHANT_ID'),
        'production' => (bool) env('MIDTRANS_PRODUCTION', false),
    ],

    /*
    | Fees are computed in integer rupiah. "bps" is basis points (1 bps = 0.01%).
    | bearer: "organizer" (deducted from the collected amount) or
    |         "payer" (added on top of the participant bill).
    */
    'fees' => [
        'bearer' => env('PATUNGAN_FEE_BEARER', 'organizer'),
        'platform' => [
            'flat' => (int) env('PLATFORM_FEE_FLAT', 250),
            'bps' => (int) env('PLATFORM_FEE_BPS', 0),
        ],
        'gateway' => [
            'flat' => (int) env('GATEWAY_FEE_FLAT', 0),
            'bps' => (int) env('GATEWAY_FEE_BPS', 70),
        ],
    ],

    'payout' => [
        'provider' => env('PAYOUT_PROVIDER', 'manual'),
        'min_amount' => (int) env('PAYOUT_MIN_AMOUNT', 10000),
    ],

    'limits' => [
        'max_participants' => 200,
        'min_amount' => 1000,
        'max_amount' => 10000000,
    ],
];
