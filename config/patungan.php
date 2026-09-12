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
        /*
        | "payer" adds the fees on top of the bill, so the organizer receives
        | exactly what they asked each participant for. "organizer" takes them
        | out of what was collected instead.
        */
        'bearer' => env('PATUNGAN_FEE_BEARER', 'payer'),
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

        /*
         | Who can tell us the name on a bank account: "none" or "dana".
         |
         | Defaults to none, and that is not laziness. DANA's inquiry lives in
         | their Disbursement product, which is activated and UAT-tested
         | separately from QRIS. Turning this on before that is done produces a
         | verification button that fails every time, which is worse for trust
         | than not offering one.
         */
        'inquiry' => env('PAYOUT_INQUIRY', 'none'),

        /*
        | When a payout may leave without a human looking at it.
        |
        | Off by default, and that is the safe direction: with it off every
        | payout still happens, it simply waits for an operator. Turning it on
        | before the provider can actually disburse changes nothing, because a
        | manual provider queues regardless - the policy says so honestly
        | rather than claiming an automation that does not exist.
        |
        | cooling_hours is the one people are tempted to shorten. It is what
        | turns an instant drain of a compromised account into something
        | somebody can still catch, so it earns its cost in patience.
        */
        'automatic' => [
            'enabled' => (bool) env('PAYOUT_AUTOMATIC', false),
            'max_amount' => (int) env('PAYOUT_AUTOMATIC_MAX', 1000000),
            'cooling_hours' => (int) env('PAYOUT_AUTOMATIC_COOLING_HOURS', 24),
        ],
    ],

    /*
    | One-time codes for verifying an organizer's phone number.
    |
    | "none" (the default) sends nothing, and that is deliberate: a verified
    | phone is what releases automatic payouts, so a driver that pretended to
    | send would mint verified numbers nobody can be warned on. With no provider
    | configured, phones stay unverified and payouts stay queued for an operator.
    |
    | "log" writes the code to the log for local work and refuses to run in
    | production at all.
    */
    'otp' => [
        'driver' => env('OTP_DRIVER', 'none'),
    ],

    /*
    | Email quality gate. The domain must really be able to receive mail, and
    | throwaway inboxes are refused - a payer we cannot reach later is a problem
    | once money is involved.
    */
    'email' => [
        'disposable_domains' => [
            '0-mail.com', '10minutemail.com', '20minutemail.com', '33mail.com',
            'anonbox.net', 'byom.de', 'dispostable.com', 'emailondeck.com',
            'fakeinbox.com', 'getairmail.com', 'getnada.com', 'guerrillamail.com',
            'guerrillamail.info', 'harakirimail.com', 'inboxbear.com', 'jetable.org',
            'mail-temporaire.fr', 'mail7.io', 'mailcatch.com', 'maildrop.cc',
            'mailinator.com', 'mailnesia.com', 'mailsac.com', 'mintemail.com',
            'moakt.com', 'mohmal.com', 'mytemp.email', 'nowmymail.com',
            'sharklasers.com', 'spam4.me', 'spamgourmet.com', 'tempinbox.com',
            'temp-mail.io', 'temp-mail.org', 'tempmail.net', 'tempmailo.com',
            'tempr.email', 'throwawaymail.com', 'trashmail.com', 'trashmail.de',
            'yopmail.com', 'yopmail.fr', 'yopmail.net',
        ],
    ],

    'limits' => [
        'max_participants' => 200,
        'min_amount' => 1000,
        'max_amount' => 10000000,
    ],
];
