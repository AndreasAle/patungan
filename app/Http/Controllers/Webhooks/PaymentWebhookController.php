<?php

namespace App\Http\Controllers\Webhooks;

use App\Contracts\AcknowledgesWebhooks;
use App\Http\Controllers\Controller;
use App\Models\WebhookLog;
use App\Payments\Dana\DanaGateway;
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
        /*
         * Reject obviously unauthenticated DANA traffic before constructing
         * the driver. Besides being cheaper, this keeps a public health probe
         * from turning a missing server credential into an opaque 500. A real
         * DANA notification always carries both required headers and will still
         * fail closed if the configured key cannot verify it.
         */
        if ($provider === DanaGateway::NAME
            && (! $request->hasHeader('X-SIGNATURE') || ! $request->hasHeader('X-TIMESTAMP'))) {
            return response()->json([
                'responseCode' => '4015600',
                'responseMessage' => 'Unauthorized',
            ], 401);
        }

        /*
         * DANA requires merchants to prove that a transient Finish Notify
         * failure is answered with 5005601 during sandbox UAT. This explicit
         * switch is intentionally unavailable in production, and it runs only
         * after the request has the headers a genuine DANA delivery carries.
         */
        if ($provider === DanaGateway::NAME
            && config('dana.environment') === 'sandbox'
            && config('dana.uat.force_notify_error') === true) {
            return response()->json([
                'responseCode' => '5005601',
                'responseMessage' => 'Internal Server Error',
            ], 500);
        }

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
