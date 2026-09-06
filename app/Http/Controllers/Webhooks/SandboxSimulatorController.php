<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Payments\Gateways\SandboxGateway;
use App\Payments\PaymentGatewayManager;
use App\Services\WebhookProcessor;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Development helper: fires a correctly signed notification for a sandbox
 * invoice so the real webhook path can be exercised end to end without a
 * provider. Registered only in local/testing - see routes/web.php.
 */
class SandboxSimulatorController extends Controller
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly WebhookProcessor $processor,
    ) {}

    public function __invoke(Request $request, string $paymentUuid): JsonResponse
    {
        $gateway = $this->gateways->driver('sandbox');
        abort_unless($gateway instanceof SandboxGateway, 404);

        $payment = Payment::query()
            ->where('gateway', 'sandbox')
            ->where('uuid', $paymentUuid)
            ->firstOrFail();

        $outcome = $request->string('outcome', 'settlement')->toString();
        abort_unless(in_array($outcome, ['settlement', 'expire', 'deny'], true), 422);

        $statusCode = $outcome === 'settlement' ? '200' : '202';
        $grossAmount = number_format($payment->charged_amount, 2, '.', '');

        $payload = [
            'order_id' => $payment->gateway_reference,
            'transaction_id' => $payment->gateway_transaction_id,
            'status_code' => $statusCode,
            'gross_amount' => $grossAmount,
            'transaction_status' => $outcome,
            'payment_type' => 'qris',
            'signature_key' => $gateway->signature($payment->gateway_reference, $statusCode, $grossAmount),
        ];

        $log = $this->processor->handle($gateway, $payload, json_encode($payload));

        return response()->json(['status' => strtolower($log->status)]);
    }
}
