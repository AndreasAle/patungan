<?php

namespace App\Payouts\Inquiry;

use App\Contracts\AccountInquiry;
use App\Payments\Dana\DanaClient;
use App\Payments\Dana\DanaCredentials;
use App\Payments\Dana\DanaExternalIdGenerator;
use App\Payments\Dana\DanaStatusMapper;
use App\Payouts\AccountInquiryResult;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Account inquiry through DANA's Disbursement product.
 *
 * Written against the same SNAP transport the QRIS driver uses, so there is one
 * place where requests are signed rather than two that can drift.
 *
 * Not switched on by default, and the reason is worth stating plainly:
 * Disbursement is a separate DANA product with its own UAT, and at the time
 * this was written only QRIS was activated for this merchant. The endpoint path
 * below follows DANA's published pattern for the disbursement APIs, but unlike
 * the QRIS driver it has never been exercised against a live sandbox. Enabling
 * it means verifying that path against the Disbursement reference first - which
 * is exactly what dana:doctor and a sandbox call are for.
 */
final class DanaAccountInquiry implements AccountInquiry
{
    /**
     * Bank account inquiry, per DANA's disbursement API family.
     *
     * Overridable in config so an operator can correct it without a deploy if
     * DANA's reference names it differently for their merchant.
     */
    public const DEFAULT_ENDPOINT = '/v1.0/emoney/account-inquiry.htm';

    public function __construct(
        private readonly DanaClient $client,
        private readonly DanaCredentials $credentials,
        private readonly DanaExternalIdGenerator $externalIds,
        private readonly string $endpoint = self::DEFAULT_ENDPOINT,
    ) {}

    public function name(): string
    {
        return 'dana';
    }

    public function isAvailable(): bool
    {
        return $this->credentials->hasMerchantId();
    }

    public function inquire(string $providerCode, string $accountNumber): AccountInquiryResult
    {
        $body = array_filter([
            'merchantId' => $this->credentials->merchantId(),
            'partnerReferenceNo' => 'INQ-'.now()->format('ymdHis').'-'.strtoupper(substr(bin2hex(random_bytes(3)), 0, 6)),
            'beneficiaryBankCode' => $providerCode,
            'beneficiaryAccountNumber' => $accountNumber,
            'additionalInfo' => ['deviceId' => 'PATUNGAN-SERVER'],
        ], static fn ($value): bool => $value !== null && $value !== '');

        try {
            $result = $this->client->post($this->endpoint, $body, $this->externalIds->generate());
        } catch (Throwable $e) {
            /*
             * Our problem, not the account holder's. Reported as unavailable so
             * the page says verification could not run, rather than telling
             * somebody their own account number is wrong.
             */
            Log::channel('dana')->warning('DANA account inquiry did not complete', [
                'provider_code' => $providerCode,
                'error' => $e->getMessage(),
            ]);

            return AccountInquiryResult::unavailable('Layanan verifikasi sedang tidak bisa dihubungi.');
        }

        $response = $result['body'];
        $code = $response['responseCode'] ?? null;

        if (! DanaStatusMapper::isSuccessResponse($code)) {
            // A 5xx is theirs to fix and may succeed on a retry; anything else
            // is a real answer about this account number.
            return DanaStatusMapper::isRetryableResponse($code)
                ? AccountInquiryResult::unavailable('Layanan verifikasi sedang bermasalah.')
                : AccountInquiryResult::notFound('Rekening tidak ditemukan.');
        }

        $holder = $this->holderFrom($response);

        if ($holder === null) {
            /*
             * A success code with no name is not a usable answer. Reporting it
             * as "not found" would blame the person for a reply we could not
             * read.
             */
            Log::channel('dana')->warning('DANA account inquiry returned no holder name', [
                'provider_code' => $providerCode,
                'response_code' => $code,
            ]);

            return AccountInquiryResult::unavailable('Nama pemilik rekening tidak diterima dari bank.');
        }

        return AccountInquiryResult::found($holder);
    }

    /**
     * The holder name, wherever the reply puts it.
     *
     * SNAP implementations disagree about the field name across products, so
     * the likely ones are tried rather than guessing a single spelling and
     * failing silently on a reply that did contain the answer.
     *
     * @param  array<string, mixed>  $response
     */
    private function holderFrom(array $response): ?string
    {
        $candidates = [
            $response['beneficiaryAccountName'] ?? null,
            $response['accountName'] ?? null,
            $response['customerName'] ?? null,
            $response['additionalInfo']['beneficiaryAccountName'] ?? null,
            $response['additionalInfo']['accountName'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                return trim($candidate);
            }
        }

        return null;
    }
}
