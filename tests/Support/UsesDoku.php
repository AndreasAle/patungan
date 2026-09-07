<?php

namespace Tests\Support;

use App\Payments\Doku\DokuAccessToken;
use App\Payments\Doku\DokuGateway;
use App\Payments\Doku\DokuQrisService;
use App\Payments\Doku\DokuSignature;
use Illuminate\Support\Facades\Http;

/**
 * Points the application at a faked DOKU sandbox.
 *
 * Real key material is generated per test run and written to a temporary
 * directory - nothing here is ever a credential, and none of it is committed.
 */
trait UsesDoku
{
    use GeneratesRsaKeys;

    protected string $dokuClientId = 'BRN-0001-TEST';

    protected string $dokuClientSecret = 'SK-test-secret';

    protected string $dokuMerchantId = 'MCH-TEST-01';

    protected string $dokuBaseUrl = 'https://api-sandbox.doku.com';

    /** Our key pair: the private key signs token requests. */
    protected array $ourKeys;

    /** DOKU's key pair: their private key signs the notifications they send. */
    protected array $dokuKeys;

    protected string $dokuKeyDir;

    protected function useDoku(): void
    {
        $this->ourKeys = $this->rsaKeyPair();
        $this->dokuKeys = $this->rsaKeyPair();

        $this->dokuKeyDir = storage_path('framework/testing/doku-'.bin2hex(random_bytes(4)));
        @mkdir($this->dokuKeyDir, 0777, true);

        file_put_contents($this->dokuKeyDir.'/private.pem', $this->ourKeys['private']);
        file_put_contents($this->dokuKeyDir.'/doku-public.pem', $this->dokuKeys['public']);

        config([
            'patungan.gateway' => DokuGateway::NAME,
            'doku.environment' => 'sandbox',
            'doku.base_url' => $this->dokuBaseUrl,
            'doku.client_id' => $this->dokuClientId,
            'doku.client_secret' => $this->dokuClientSecret,
            'doku.merchant_id' => $this->dokuMerchantId,
            'doku.terminal_id' => 'PTGN01',
            'doku.channel_id' => 'H2H',
            'doku.private_key_path' => $this->dokuKeyDir.'/private.pem',
            'doku.doku_public_key_path' => $this->dokuKeyDir.'/doku-public.pem',
            'doku.notification_url' => 'https://patungan.test/webhooks/payments/doku',
        ]);
    }

    protected function tearDownDoku(): void
    {
        if (! isset($this->dokuKeyDir) || ! is_dir($this->dokuKeyDir)) {
            return;
        }

        foreach (glob($this->dokuKeyDir.'/*') ?: [] as $file) {
            @unlink($file);
        }

        @rmdir($this->dokuKeyDir);
    }

    /**
     * Token endpoint plus a successful QRIS generate.
     *
     * Each charge gets its own referenceNo, because DOKU issues a distinct one
     * per QR and the payments table enforces that with a unique index.
     */
    protected function fakeDokuQrisGenerate(string $qrContent = '00020101021226', string $referenceNo = 'DOKU-REF-1'): void
    {
        $issued = 0;

        Http::fake([
            $this->dokuBaseUrl.DokuAccessToken::ENDPOINT => Http::response([
                'responseCode' => '2007300',
                'responseMessage' => 'Successful',
                'accessToken' => 'test-access-token',
                'tokenType' => 'Bearer',
                'expiresIn' => '900',
            ]),
            $this->dokuBaseUrl.DokuQrisService::GENERATE => function () use ($qrContent, $referenceNo, &$issued) {
                $issued++;

                return Http::response([
                    'responseCode' => '2004700',
                    'responseMessage' => 'Successful',
                    'referenceNo' => $issued === 1 ? $referenceNo : $referenceNo.'-'.$issued,
                    'qrContent' => $issued === 1 ? $qrContent : $qrContent.'-'.$issued,
                    'terminalId' => 'PTGN01',
                ]);
            },
        ]);
    }

    /**
     * Builds the headers DOKU would send with a notification, signed the way
     * their official SDK signs it.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, string>
     */
    protected function dokuNotificationHeaders(array $payload, ?string $timestamp = null): array
    {
        $timestamp ??= DokuSignature::timestamp();

        return [
            'X-SIGNATURE' => DokuSignature::asymmetric($this->dokuClientId, $timestamp, $this->dokuKeys['private']),
            'X-TIMESTAMP' => $timestamp,
            'X-PARTNER-ID' => $this->dokuClientId,
            'X-EXTERNAL-ID' => (string) random_int(1_000_000_000, 9_999_999_999),
            'CHANNEL-ID' => 'H2H',
        ];
    }

    /**
     * The same notification signed the symmetric way the docs describe, so both
     * schemes are exercised.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, string>
     */
    protected function dokuSymmetricHeaders(array $payload, string $path = '/webhooks/payments/doku'): array
    {
        $timestamp = DokuSignature::timestamp();
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $signature = DokuSignature::symmetric(
            DokuSignature::transactionStringToSign('POST', $path, '', DokuSignature::hashBody((string) $body), $timestamp),
            $this->dokuClientSecret,
        );

        return [
            'X-SIGNATURE' => $signature,
            'X-TIMESTAMP' => $timestamp,
            'X-PARTNER-ID' => $this->dokuClientId,
            'X-EXTERNAL-ID' => (string) random_int(1_000_000_000, 9_999_999_999),
            'CHANNEL-ID' => 'H2H',
        ];
    }

    /**
     * A QRIS payment notification body.
     *
     * @return array<string, mixed>
     */
    protected function dokuNotificationPayload(
        string $partnerReferenceNo,
        int $amount,
        string $status = '00',
        string $referenceNo = 'DOKU-REF-1',
    ): array {
        return [
            'originalPartnerReferenceNo' => $partnerReferenceNo,
            'originalReferenceNo' => $referenceNo,
            'latestTransactionStatus' => $status,
            'transactionStatusDesc' => $status === '00' ? 'Success' : 'Other',
            'amount' => ['value' => number_format($amount, 2, '.', ''), 'currency' => 'IDR'],
            'additionalInfo' => ['channel' => 'QRIS', 'paymentType' => 'SALE'],
        ];
    }
}
