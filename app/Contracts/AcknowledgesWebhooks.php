<?php

namespace App\Contracts;

use App\Models\WebhookLog;

/**
 * Implemented by gateways that require a particular acknowledgement body.
 *
 * Most providers only look at the HTTP status. DANA does not: its Finish Notify
 * reference says a reply with a missing or unrecognised responseCode is filed
 * as Pending and retried for seven days. Answering with our own house format
 * would therefore be understood as "no answer", and a single payment would be
 * re-delivered for a week.
 *
 * Kept separate from PaymentGateway so drivers that do not need it are not made
 * to carry a method they would only ever answer with a shrug.
 */
interface AcknowledgesWebhooks
{
    /**
     * The body and HTTP status to answer a notification with.
     *
     * @param  string  $status  one of the WebhookLog::STATUS_* values
     * @return array{body: array<string, mixed>, http_status: int}
     */
    public function acknowledge(string $status): array;

    /** @return array{body: array<string, mixed>, http_status: int} */
    public function acknowledgeUnavailable(): array;
}
