<?php

namespace App\Payments\Dana;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Payments\ChargeRequest;
use App\Payments\ChargeResult;
use App\Payments\Dana\Exceptions\DanaApiException;
use App\Payments\Dana\Exceptions\DanaInvalidResponseException;
use App\Payments\GatewayEvent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;

/**
 * The three DANA QRIS MPM endpoints this payment flow needs.
 *
 *   generate  POST /v1.0/qr/qr-mpm-generate.htm   service code 47
 *   query     POST /rest/v1.1/debit/status        service code 55
 *   cancel    POST /v1.0/debit/cancel.htm         service code 57
 *
 * Generate returns qrContent, the raw QR payload, which the payment page draws
 * itself - a participant never leaves a Patungan screen to pay.
 */
final class DanaQrisService
{
    public const GENERATE = '/v1.0/qr/qr-mpm-generate.htm';

    public const QUERY = '/rest/v1.1/debit/status';

    public const CANCEL = '/v1.0/debit/cancel.htm';

    /** QRIS MPM (Acquirer), per DANA's service code table. */
    private const SERVICE_CODE = '47';

    /** DANA caps partnerReferenceNo at 25 characters for QRIS specifically. */
    private const MAX_REFERENCE_LENGTH = 25;

    public function __construct(
        private readonly DanaClient $client,
        private readonly DanaCredentials $credentials,
    ) {}

    public function generate(ChargeRequest $request, string $externalId): ChargeResult
    {
        $this->guardReference($request->reference);

        $expiresAt = CarbonImmutable::now()->addSeconds($request->expirySeconds);

        $body = array_filter([
            'merchantId' => $this->credentials->merchantId(),
            'subMerchantId' => $this->credentials->subMerchantId,
            'storeId' => $this->credentials->storeId(),
            'partnerReferenceNo' => $request->reference,
            'amount' => [
                'value' => DanaStatusMapper::rupiahToAmount($request->amount),
                'currency' => 'IDR',
            ],
            'validityPeriod' => $expiresAt->format('Y-m-d\TH:i:sP'),
            'additionalInfo' => [
                'envInfo' => [
                    // A server-to-server call from our own backend: DANA's
                    // enums for a payment gateway integration with no device.
                    'sourcePlatform' => 'IPG',
                    'terminalType' => 'SYSTEM',
                    'orderTerminalType' => 'WEB',
                ],
            ],
        ], static fn ($value): bool => $value !== null && $value !== '');

        $result = $this->client->post(self::GENERATE, $body, $externalId);
        $response = $result['body'];

        if (! DanaStatusMapper::isSuccessResponse($response['responseCode'] ?? null)) {
            Log::channel('dana')->warning('DANA QRIS generate rejected', [
                'endpoint' => self::GENERATE,
                'external_id' => $externalId,
                'partner_reference_no' => $request->reference,
                'response_code' => $response['responseCode'] ?? null,
                'response_message' => $response['responseMessage'] ?? null,
            ]);

            throw new DanaApiException(context: [
                'reason' => 'DANA refused the QRIS charge.',
                'response_code' => $response['responseCode'] ?? null,
                'response_message' => $response['responseMessage'] ?? null,
            ]);
        }

        $qrContent = $response['qrContent'] ?? null;
        $referenceNo = $response['referenceNo'] ?? null;

        /*
         * Both are required before this counts as a usable invoice. Without
         * qrContent there is nothing for the payer to scan; without referenceNo
         * we could not later match DANA's own notification to this payment.
         */
        if (! is_string($qrContent) || $qrContent === '') {
            throw new DanaInvalidResponseException(context: [
                'reason' => 'DANA accepted the charge but returned no QR content.',
                'external_id' => $externalId,
            ]);
        }

        if (! is_string($referenceNo) || $referenceNo === '') {
            throw new DanaInvalidResponseException(context: [
                'reason' => 'DANA accepted the charge but returned no reference number.',
                'external_id' => $externalId,
            ]);
        }

        return new ChargeResult(
            transactionId: $referenceNo,
            // A freshly generated QR is always awaiting payment.
            status: PaymentStatus::Pending,
            qrString: $qrContent,
            qrUrl: is_string($response['qrUrl'] ?? null) ? $response['qrUrl'] : null,
            expiresAt: $expiresAt,
            raw: $this->keepUseful($response),
            externalId: $externalId,
        );
    }

    /**
     * Server-to-server status check, used when a notification is late and by
     * the reconciliation job. This and a verified notification are the only two
     * things allowed to settle a payment.
     */
    public function query(Payment $payment, string $externalId): ?GatewayEvent
    {
        $body = array_filter([
            'originalPartnerReferenceNo' => $payment->gateway_reference,
            'originalReferenceNo' => $payment->gateway_transaction_id,
            'serviceCode' => self::SERVICE_CODE,
            'merchantId' => $this->credentials->merchantId(),
            'subMerchantId' => $this->credentials->subMerchantId,
        ], static fn ($value): bool => $value !== null && $value !== '');

        try {
            $result = $this->client->post(self::QUERY, $body, $externalId);
        } catch (DanaApiException) {
            Log::channel('dana')->warning('DANA QRIS query failed', [
                'payment' => $payment->uuid,
                'external_id' => $externalId,
            ]);

            return null;
        }

        $response = $result['body'];

        if (! DanaStatusMapper::isSuccessResponse($response['responseCode'] ?? null)) {
            return null;
        }

        $status = $response['latestTransactionStatus'] ?? null;

        if (! is_string($status)) {
            return null;
        }

        /*
         * An unpaid order legitimately carries no amount. Reporting it as
         * pending with the invoice's own figure is correct and lets the caller
         * see "still not paid" rather than nothing at all; an amount is only
         * insisted on when DANA claims the order is settled, because that is
         * the number the ledger would be built from.
         */
        $amount = DanaStatusMapper::amountToRupiah($response['amount']['value'] ?? null);

        if ($amount === null) {
            if ($status === DanaStatusMapper::SUCCESS) {
                Log::channel('dana')->warning('DANA reported a paid order with an unreadable amount', [
                    'payment' => $payment->uuid,
                    'external_id' => $externalId,
                ]);

                return null;
            }

            $amount = (int) $payment->charged_amount;
        }

        return new GatewayEvent(
            reference: $payment->gateway_reference,
            transactionId: is_string($response['originalReferenceNo'] ?? null)
                ? $response['originalReferenceNo']
                : $payment->gateway_transaction_id,
            status: DanaStatusMapper::fromTransactionStatus($status),
            grossAmount: $amount,
            // A signed request answered over TLS is as authoritative as a
            // signed notification: nobody else could have produced this reply.
            signatureValid: true,
            eventType: 'qris.query.'.$status,
            raw: $this->keepUseful($response),
        );
    }

    /**
     * Closes an order on DANA's side.
     *
     * Unlike DOKU, DANA does offer a cancel endpoint, so an abandoned invoice
     * can be retired properly instead of being left to time out. A failure here
     * is logged and swallowed: the invoice still expires locally, and throwing
     * would turn housekeeping into a visible error for the organizer.
     */
    public function cancel(Payment $payment, string $externalId, string $reason): bool
    {
        $body = array_filter([
            'originalPartnerReferenceNo' => $payment->gateway_reference,
            'originalReferenceNo' => $payment->gateway_transaction_id,
            'merchantId' => $this->credentials->merchantId(),
            'subMerchantId' => $this->credentials->subMerchantId,
            'reason' => $reason,
            'amount' => [
                'value' => DanaStatusMapper::rupiahToAmount((int) $payment->charged_amount),
                'currency' => 'IDR',
            ],
        ], static fn ($value): bool => $value !== null && $value !== '');

        try {
            $result = $this->client->post(self::CANCEL, $body, $externalId);
        } catch (DanaApiException) {
            Log::channel('dana')->warning('DANA cancel did not complete', [
                'payment' => $payment->uuid,
                'external_id' => $externalId,
            ]);

            return false;
        }

        $accepted = DanaStatusMapper::isSuccessResponse($result['body']['responseCode'] ?? null);

        Log::channel('dana')->info('DANA cancel', [
            'payment' => $payment->uuid,
            'external_id' => $externalId,
            'accepted' => $accepted,
            'response_code' => $result['body']['responseCode'] ?? null,
        ]);

        return $accepted;
    }

    /**
     * DANA caps partnerReferenceNo at 25 characters for QRIS. Our references
     * are generated, not user input, so exceeding it is a bug on our side and
     * is caught here rather than becoming an opaque DANA rejection.
     */
    private function guardReference(string $reference): void
    {
        if ($reference === '' || strlen($reference) > self::MAX_REFERENCE_LENGTH) {
            throw new DanaApiException(context: [
                'reason' => 'partnerReferenceNo must be 1-'.self::MAX_REFERENCE_LENGTH.' characters for QRIS.',
                'length' => strlen($reference),
            ]);
        }
    }

    /**
     * Keeps only what reconciliation and support actually need.
     *
     * The full body is never stored: it is large, it is never shown to a
     * browser, and it can carry payer details we have no reason to keep.
     *
     * @param  array<string, mixed>  $response
     * @return array<string, mixed>
     */
    private function keepUseful(array $response): array
    {
        return array_filter([
            'responseCode' => $response['responseCode'] ?? null,
            'responseMessage' => $response['responseMessage'] ?? null,
            'referenceNo' => $response['referenceNo'] ?? $response['originalReferenceNo'] ?? null,
            'partnerReferenceNo' => $response['partnerReferenceNo'] ?? $response['originalPartnerReferenceNo'] ?? null,
            'latestTransactionStatus' => $response['latestTransactionStatus'] ?? null,
            'transactionStatusDesc' => $response['transactionStatusDesc'] ?? null,
            'amount' => $response['amount'] ?? null,
            'merchantName' => $response['merchantName'] ?? null,
            'storeId' => $response['storeId'] ?? null,
            'paidTime' => $response['additionalInfo']['paymentInfo']['paidTime'] ?? null,
        ], static fn ($value): bool => $value !== null);
    }
}
