<?php

namespace App\Contracts;

use App\Models\Payment;
use App\Payments\ChargeRequest;
use App\Payments\ChargeResult;
use App\Payments\GatewayEvent;

interface PaymentGateway
{
    /** Identifier stored on every payment row, e.g. "midtrans". */
    public function name(): string;

    /** Opens a dynamic QRIS charge with the provider. */
    public function createQrisCharge(ChargeRequest $request): ChargeResult;

    /**
     * Normalises an inbound webhook and reports whether its signature checked out.
     * Returns null when the payload is not a payment notification we understand.
     *
     * @param  array<string, mixed>  $payload
     */
    public function parseWebhook(array $payload, string $rawBody): ?GatewayEvent;

    /** Pulls the authoritative status from the provider, for reconciliation. */
    public function fetchStatus(Payment $payment): ?GatewayEvent;

    /** Best-effort cancellation of an invoice the participant abandoned. */
    public function cancel(Payment $payment): void;
}
