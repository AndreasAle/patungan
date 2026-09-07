<?php

namespace App\Payments\Doku;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Payments\ChargeRequest;
use App\Payments\ChargeResult;
use App\Payments\Doku\Exceptions\DokuApiException;
use App\Payments\Doku\Exceptions\DokuInvalidResponseException;
use App\Payments\GatewayEvent;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;

/**
 * QRIS MPM generate and query, the two DOKU endpoints the payment flow needs.
 *
 * Generate returns the raw QR content, which the payment page renders itself -
 * the participant never leaves a Patungan-branded screen.
 */
final class DokuQrisService
{
    public const GENERATE = '/snap-adapter/b2b/v1.0/qr/qr-mpm-generate';

    public const QUERY = '/snap-adapter/b2b/v1.0/qr/qr-mpm-query';

    /** QRIS service code, per DOKU's query reference. */
    private const SERVICE_CODE = '47';

    public function __construct(
        private readonly DokuClient $client,
        private readonly DokuCredentials $credentials,
    ) {}

    public function generate(ChargeRequest $request, string $externalId): ChargeResult
    {
        $expiresAt = CarbonImmutable::now()->addSeconds($request->expirySeconds);

        $body = [
            'partnerReferenceNo' => $request->reference,
            'amount' => [
                'value' => DokuStatusMapper::rupiahToAmount($request->amount),
                'currency' => 'IDR',
            ],
            'merchantId' => $this->credentials->merchantId(),
            'terminalId' => $this->credentials->terminalId,
            'validityPeriod' => $expiresAt->format('Y-m-d\TH:i:sP'),
            'additionalInfo' => [
                // feeType 1 is "No Tips", the only mode this product uses.
                'feeType' => '1',
            ],
        ];

        $result = $this->client->post(self::GENERATE, $body, $externalId);
        $response = $result['body'];

        if (! DokuStatusMapper::isSuccessResponse($response['responseCode'] ?? null)) {
            Log::channel('doku')->warning('DOKU QRIS generate rejected', [
                'endpoint' => self::GENERATE,
                'external_id' => $externalId,
                'partner_reference_no' => $request->reference,
                'response_code' => $response['responseCode'] ?? null,
                'response_message' => $response['responseMessage'] ?? null,
            ]);

            throw new DokuApiException(context: [
                'reason' => 'DOKU refused the QRIS charge.',
                'response_code' => $response['responseCode'] ?? null,
                'response_message' => $response['responseMessage'] ?? null,
            ]);
        }

        $qrContent = $response['qrContent'] ?? null;
        $referenceNo = $response['referenceNo'] ?? null;

        if (! is_string($qrContent) || $qrContent === '' || ! is_string($referenceNo) || $referenceNo === '') {
            throw new DokuInvalidResponseException(context: [
                'reason' => 'DOKU accepted the charge but returned no QR content or reference.',
                'external_id' => $externalId,
            ]);
        }

        $validity = $response['additionalInfo']['validityPeriod'] ?? null;

        return new ChargeResult(
            transactionId: $referenceNo,
            // A freshly generated QR is always awaiting payment.
            status: PaymentStatus::Pending,
            qrString: $qrContent,
            qrUrl: null,
            expiresAt: is_string($validity) ? $this->parseValidity($validity, $expiresAt) : $expiresAt,
            raw: $this->keepUseful($response),
            externalId: $externalId,
        );
    }

    /**
     * Server-to-server status check, used when a webhook is late and by the
     * reconciliation job. This and a verified notification are the only two
     * things allowed to settle a payment.
     */
    public function query(Payment $payment, string $externalId): ?GatewayEvent
    {
        $body = [
            'originalPartnerReferenceNo' => $payment->gateway_reference,
            'serviceCode' => self::SERVICE_CODE,
            'merchantId' => $this->credentials->merchantId(),
        ];

        if (filled($payment->gateway_transaction_id)) {
            $body['originalReferenceNo'] = $payment->gateway_transaction_id;
        }

        try {
            $result = $this->client->post(self::QUERY, $body, $externalId);
        } catch (DokuApiException $e) {
            Log::channel('doku')->warning('DOKU QRIS query failed', [
                'payment' => $payment->uuid,
                'external_id' => $externalId,
            ]);

            return null;
        }

        $response = $result['body'];

        if (! DokuStatusMapper::isSuccessResponse($response['responseCode'] ?? null)) {
            return null;
        }

        $status = $response['latestTransactionStatus'] ?? null;
        $amount = DokuStatusMapper::amountToRupiah($response['amount']['value'] ?? null);

        if (! is_string($status) || $amount === null) {
            return null;
        }

        return new GatewayEvent(
            reference: $payment->gateway_reference,
            transactionId: is_string($response['originalReferenceNo'] ?? null)
                ? $response['originalReferenceNo']
                : $payment->gateway_transaction_id,
            status: DokuStatusMapper::fromTransactionStatus($status),
            grossAmount: $amount,
            // A server-to-server reply over TLS on a signed request is as
            // authoritative as a signed notification.
            signatureValid: true,
            eventType: 'qris.query.'.$status,
            raw: $this->keepUseful($response),
        );
    }

    /**
     * Keeps only what reconciliation and support actually need. The full body is
     * never stored: it is large, and it is never shown to a browser.
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
            'paidTime' => $response['paidTime'] ?? null,
            'amount' => $response['amount'] ?? null,
            'feeAmount' => $response['feeAmount'] ?? null,
            'terminalId' => $response['terminalId'] ?? null,
            'issuerName' => $response['additionalInfo']['issuerName'] ?? null,
        ], static fn ($value) => $value !== null);
    }

    private function parseValidity(string $validity, CarbonImmutable $fallback): CarbonImmutable
    {
        try {
            return CarbonImmutable::parse($validity);
        } catch (\Throwable) {
            return $fallback;
        }
    }
}
