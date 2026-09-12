<?php

namespace Tests\Support;

use App\Payments\Dana\DanaGateway;
use App\Payments\Dana\DanaQrisService;
use App\Payments\Dana\DanaSignature;
use Illuminate\Support\Facades\Http;

/**
 * Points the application at a faked DANA sandbox.
 *
 * Real key material is generated per test run and written to a temporary
 * directory. Nothing here is a credential, and none of it is committed - the
 * only reason genuine RSA keys are used at all is that a fake signature would
 * not exercise the code that actually protects the ledger.
 */
trait UsesDana
{
    use GeneratesRsaKeys;

    protected string $danaPartnerId = 'DANA-CLIENT-TEST';

    protected string $danaMerchantId = 'MCH-DANA-TEST';

    protected string $danaBaseUrl = 'https://api-sandbox.dana.id';

    protected string $danaNotificationPath = '/v1.0/debit/notify';

    /** Our key pair: the private key signs the requests we send. */
    protected array $ourDanaKeys;

    /** DANA's key pair: their private key signs the notifications they send. */
    protected array $danaKeys;

    protected string $danaKeyDir;

    protected function useDana(): void
    {
        $this->ourDanaKeys = $this->rsaKeyPair();
        $this->danaKeys = $this->rsaKeyPair();

        $this->danaKeyDir = storage_path('framework/testing/dana-'.bin2hex(random_bytes(4)));
        @mkdir($this->danaKeyDir, 0777, true);

        file_put_contents($this->danaKeyDir.'/private.pem', $this->ourDanaKeys['private']);
        file_put_contents($this->danaKeyDir.'/dana-public.pem', $this->danaKeys['public']);

        config([
            'patungan.gateway' => DanaGateway::NAME,
            'dana.environment' => 'sandbox',
            'dana.base_url' => $this->danaBaseUrl,
            'dana.partner_id' => $this->danaPartnerId,
            'dana.merchant_id' => $this->danaMerchantId,
            'dana.store_id' => 'STORE-TEST-01',
            'dana.channel_id' => '95221',
            'dana.origin' => 'patungan.test',
            'dana.private_key_path' => $this->danaKeyDir.'/private.pem',
            'dana.dana_public_key_path' => $this->danaKeyDir.'/dana-public.pem',
            'dana.notification_url' => 'https://patungan.test'.$this->danaNotificationPath,
        ]);
    }

    protected function tearDownDana(): void
    {
        if (! isset($this->danaKeyDir) || ! is_dir($this->danaKeyDir)) {
            return;
        }

        foreach (glob($this->danaKeyDir.'/*') ?: [] as $file) {
            @unlink($file);
        }

        @rmdir($this->danaKeyDir);
    }

    /**
     * A successful QRIS generate.
     *
     * Each charge gets its own referenceNo, because DANA issues a distinct one
     * per QR and the payments table enforces that with a unique index.
     */
    protected function fakeDanaQrisGenerate(string $qrContent = '00020101021226', string $referenceNo = 'DANA-REF-1'): void
    {
        $issued = 0;

        Http::fake([
            $this->danaBaseUrl.DanaQrisService::GENERATE => function () use ($qrContent, $referenceNo, &$issued) {
                $issued++;

                return Http::response([
                    'responseCode' => '2004700',
                    'responseMessage' => 'Successful',
                    'referenceNo' => $issued === 1 ? $referenceNo : $referenceNo.'-'.$issued,
                    'partnerReferenceNo' => 'PTG-TEST',
                    'qrContent' => $issued === 1 ? $qrContent : $qrContent.'-'.$issued,
                    'storeId' => 'STORE-TEST-01',
                ]);
            },
        ]);
    }

    /** A successful cancel, which retires the QR on DANA's side. */
    protected function fakeDanaCancel(): void
    {
        Http::fake([
            $this->danaBaseUrl.DanaQrisService::CANCEL => Http::response([
                'responseCode' => '2005700',
                'responseMessage' => 'Successful',
            ]),
        ]);
    }

    /**
     * Headers signed exactly the way DANA signs a Finish Notify: RSA over
     * METHOD:path:bodyHash:timestamp, with DANA's private key.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, string>
     */
    protected function danaNotificationHeaders(
        array $payload,
        ?string $timestamp = null,
        ?string $path = null,
        ?string $privateKey = null,
    ): array {
        $timestamp ??= DanaSignature::timestamp();
        $path ??= $this->danaNotificationPath;

        $body = (string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $signature = DanaSignature::sign(
            DanaSignature::transactionStringToSign('POST', $path, DanaSignature::hashBody($body), $timestamp),
            $privateKey ?? $this->danaKeys['private'],
        );

        return [
            'X-SIGNATURE' => $signature,
            'X-TIMESTAMP' => $timestamp,
            'X-PARTNER-ID' => $this->danaPartnerId,
            'X-EXTERNAL-ID' => (string) random_int(1_000_000_000, 9_999_999_999),
            'CHANNEL-ID' => '95221',
        ];
    }

    /**
     * A QRIS Finish Notify body, shaped as in DANA's reference.
     *
     * @return array<string, mixed>
     */
    protected function danaNotificationPayload(
        string $partnerReferenceNo,
        int $amount,
        string $status = '00',
        string $referenceNo = 'DANA-REF-1',
    ): array {
        return [
            'originalPartnerReferenceNo' => $partnerReferenceNo,
            'originalReferenceNo' => $referenceNo,
            'merchantId' => $this->danaMerchantId,
            'amount' => ['value' => number_format($amount, 2, '.', ''), 'currency' => 'IDR'],
            'latestTransactionStatus' => $status,
            'transactionStatusDesc' => $status === '00' ? 'success' : 'closed',
            'createdTime' => DanaSignature::timestamp(),
            'finishedTime' => DanaSignature::timestamp(),
        ];
    }
}
