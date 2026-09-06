<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class WebhookLog extends Model
{
    public const STATUS_RECEIVED = 'RECEIVED';

    public const STATUS_PROCESSED = 'PROCESSED';

    public const STATUS_DUPLICATE = 'DUPLICATE';

    public const STATUS_IGNORED = 'IGNORED';

    public const STATUS_REJECTED = 'REJECTED';

    public const STATUS_FAILED = 'FAILED';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
            'signature_valid' => 'boolean',
            'processed_at' => 'datetime',
        ];
    }

    /**
     * Strips credentials and card-like data before a payload is persisted or shown
     * in the admin panel.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public static function sanitise(array $payload): array
    {
        $secretKeys = [
            'signature_key', 'server_key', 'client_key', 'api_key', 'authorization',
            'card_number', 'masked_card', 'token_id', 'saved_token_id', 'secret',
        ];

        foreach ($payload as $key => $value) {
            if (is_array($value)) {
                $payload[$key] = static::sanitise($value);

                continue;
            }

            if (in_array(strtolower((string) $key), $secretKeys, true)) {
                $payload[$key] = '[redacted]';
            }
        }

        return $payload;
    }
}
