<?php

namespace App\Http\Controllers\Webhooks;

use App\Contracts\AcknowledgesWebhooks;
use App\Http\Controllers\Controller;
use App\Models\WebhookLog;
use App\Payments\InboundWebhook;
use App\Payments\PaymentGatewayManager;
use App\Services\WebhookProcessor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentWebhookController extends Controller
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly WebhookProcessor $processor,
    ) {}

    public function __invoke(Request $request, string $provider): JsonResponse
    {
        $gateway = $this->gateways->driver($provider);

        $log = $this->processor->handle($gateway, InboundWebhook::fromRequest($request));

        /*
         * Some providers read the body, not just the status. DANA files a reply
         * without a recognised responseCode as "no answer" and re-delivers the
         * notification for seven days, so a driver is allowed to dictate its own
         * acknowledgement.
         */
        if ($gateway instanceof AcknowledgesWebhooks) {
            $acknowledgement = $gateway->acknowledge($log->status);

            return response()->json($acknowledgement['body'], $acknowledgement['http_status']);
        }

        /*
         * Providers retry on non-2xx. Everything we understood - including
         * duplicates - is acknowledged; only a genuine processing failure asks
         * for a retry.
         */
        $status = $log->status === WebhookLog::STATUS_FAILED ? 500 : 200;

        return response()->json(['status' => strtolower($log->status)], $status);
    }
}
