<?php

/*
|--------------------------------------------------------------------------
| DOKU SNAP (Direct API)
|--------------------------------------------------------------------------
|
| Credentials live only in .env - nothing here may be committed with a real
| value. Application code reads this file, never env() directly, so config
| caching keeps working in production.
|
*/

return [

    // "sandbox" or "production". Nothing else selects the live host.
    'environment' => env('DOKU_ENV', 'sandbox'),

    /*
    | Defaults to the host that matches DOKU_ENV, so setting the environment is
    | enough. An explicit DOKU_BASE_URL still wins, but DokuCredentials refuses
    | a value that contradicts DOKU_ENV.
    */
    'base_url' => rtrim((string) env(
        'DOKU_BASE_URL',
        env('DOKU_ENV') === 'production' ? 'https://api.doku.com' : 'https://api-sandbox.doku.com',
    ), '/'),

    'client_id' => env('DOKU_CLIENT_ID'),

    'client_secret' => env('DOKU_CLIENT_SECRET'),

    'merchant_id' => env('DOKU_MERCHANT_ID'),

    // Terminal identifier sent with every QRIS request. 3-16 alphanumeric.
    'terminal_id' => env('DOKU_TERMINAL_ID', 'PTGN01'),

    /*
    | Our RSA key pair. The private key signs the B2B token request; DOKU's
    | public key verifies the notifications DOKU sends us. Paths are absolute
    | or relative to the project root, and the files must stay out of git.
    */
    'private_key_path' => env('DOKU_PRIVATE_KEY_PATH'),

    'public_key_path' => env('DOKU_PUBLIC_KEY_PATH'),

    'doku_public_key_path' => env('DOKU_DOKU_PUBLIC_KEY_PATH'),

    'channel_id' => env('DOKU_CHANNEL_ID', 'H2H'),

    // Where DOKU posts notifications. Its path is part of the signed string.
    'notification_url' => env('DOKU_PAYMENT_NOTIFICATION_URL'),

    'http' => [
        'connect_timeout' => (int) env('DOKU_CONNECT_TIMEOUT', 10),
        'timeout' => (int) env('DOKU_TIMEOUT', 30),
    ],

    /*
    | Split settlement and payout both need DOKU to switch the service on for
    | the merchant. Until they confirm that, these stay false and the code must
    | not pretend otherwise.
    */
    'split_settlement' => [
        'enabled' => (bool) env('DOKU_ENABLE_SPLIT_SETTLEMENT', false),
    ],

    'payout' => [
        'enabled' => (bool) env('DOKU_ENABLE_PAYOUT', false),
    ],

];
