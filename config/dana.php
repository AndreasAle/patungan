<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Environment
    |--------------------------------------------------------------------------
    |
    | "sandbox" or "production". This is checked against the host in base_url
    | when the driver is built, and a mismatch is refused rather than reported:
    | a base URL pointing at production while this says sandbox would move real
    | money while everyone involved believed they were testing.
    |
    */

    'environment' => env('DANA_ENV', 'sandbox'),

    /*
    |--------------------------------------------------------------------------
    | API host
    |--------------------------------------------------------------------------
    |
    | No default is guessed here. DANA issues the sandbox host together with the
    | sandbox credentials, and inventing a plausible-looking URL would fail in a
    | way that looks like a credential problem instead of a missing setting.
    |
    */

    'base_url' => env('DANA_BASE_URL'),

    /*
    |--------------------------------------------------------------------------
    | Credentials
    |--------------------------------------------------------------------------
    |
    | partner_id is what DANA calls the Client ID; it travels as X-PARTNER-ID.
    | Nothing secret belongs in this file - the private key lives on disk,
    | outside the repository, and is referenced by path.
    |
    */

    'partner_id' => env('DANA_PARTNER_ID'),
    'merchant_id' => env('DANA_MERCHANT_ID'),
    'store_id' => env('DANA_STORE_ID'),
    'sub_merchant_id' => env('DANA_SUB_MERCHANT_ID'),

    /*
    | Device identifier DANA requires on every call. Any value they accept will
    | do; it exists so their logs can tell one integration from another.
    */
    'channel_id' => env('DANA_CHANNEL_ID', '95221'),

    /* Sent as the ORIGIN header. DANA matches it against the registered domain. */
    'origin' => env('DANA_ORIGIN'),

    /*
    |--------------------------------------------------------------------------
    | Keys
    |--------------------------------------------------------------------------
    |
    | Paths, never contents. A PEM pasted into .env loses its newlines and
    | produces a signature failure that reads like a credential problem.
    |
    | dana_public_key_path is what verifies the notifications DANA sends. Without
    | it every notification is refused, because there would be no way to tell a
    | real settlement from a forged one - the endpoint is public.
    |
    */

    'private_key_path' => env('DANA_PRIVATE_KEY_PATH'),
    'dana_public_key_path' => env('DANA_DANA_PUBLIC_KEY_PATH'),

    /*
    |--------------------------------------------------------------------------
    | Finish Notify
    |--------------------------------------------------------------------------
    |
    | The URL registered with DANA. It is stored so the signature check can use
    | the path DANA actually signed, which may differ from the path this
    | application sees when a proxy rewrites a prefix.
    |
    */

    'notification_url' => env('DANA_NOTIFICATION_URL'),

    /*
    |--------------------------------------------------------------------------
    | Account inquiry
    |--------------------------------------------------------------------------
    |
    | Overridable because this endpoint belongs to the Disbursement product,
    | which is activated separately from QRIS. Leaving it configurable means a
    | corrected path is an env change rather than a deploy.
    |
    */

    'inquiry_endpoint' => env('DANA_INQUIRY_ENDPOINT', '/v1.0/emoney/account-inquiry.htm'),

    /*
    | Sandbox UAT switch for DANA's required 5005601 Finish Notify scenario.
    | The controller also checks DANA_ENV=sandbox, so this can never force a
    | production notification to fail even if an operator forgets to unset it.
    */
    'uat' => [
        'force_notify_error' => (bool) env('DANA_UAT_FORCE_NOTIFY_ERROR', false),
    ],

    'http' => [
        /*
         | DANA documents an 8 second expected timeout per API. The read timeout
         | is set above that so a slow-but-successful call is not abandoned:
         | abandoning it does not undo the order on DANA's side, it only leaves
         | us not knowing about it.
         */
        'connect_timeout' => (int) env('DANA_CONNECT_TIMEOUT', 10),
        'timeout' => (int) env('DANA_TIMEOUT', 30),
    ],

];
