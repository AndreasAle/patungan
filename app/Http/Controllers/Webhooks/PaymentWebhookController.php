<?php

namespace App\Http\Controllers\Webhooks;

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
         * Providers retry on non-2xx. Everything we understood - including
         * duplicates - is acknowledged; only a genuine processing failure asks
         * for a retry.
         */
        $status = $log->status === WebhookLog::STATUS_FAILED ? 500 : 200;

        return response()->json(['status' => strtolower($log->status)], $status);
    }
}
