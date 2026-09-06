<?php

namespace App\Services;

use App\Models\AnalyticsEvent;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Internal product analytics. Events are rows in our own table - no third-party
 * tracker, and never a raw IP address.
 */
class Analytics
{
    public const PATUNGAN_CREATED = 'patungan_created';

    public const SHARE_CLICKED = 'share_clicked';

    public const PARTICIPANT_SELECTED = 'participant_selected';

    public const PAYMENT_CREATED = 'payment_created';

    public const PAYMENT_PAID = 'payment_paid';

    public const PATUNGAN_COMPLETED = 'patungan_completed';

    public const PAYOUT_REQUESTED = 'payout_requested';

    public const PAYOUT_COMPLETED = 'payout_completed';

    /** @param  array<string, mixed>  $properties */
    public function record(string $name, array $properties = [], ?int $userId = null, ?int $patunganId = null, ?int $paymentId = null, ?string $visitorKey = null): void
    {
        try {
            AnalyticsEvent::create([
                'name' => $name,
                'user_id' => $userId,
                'patungan_id' => $patunganId,
                'payment_id' => $paymentId,
                'visitor_hash' => $visitorKey ? hash('sha256', $visitorKey.config('app.key')) : null,
                'properties' => $properties ?: null,
                'created_at' => now(),
            ]);
        } catch (Throwable $e) {
            // Analytics must never break a payment flow.
            Log::warning('Analytics write failed', ['event' => $name, 'error' => $e->getMessage()]);
        }
    }
}
