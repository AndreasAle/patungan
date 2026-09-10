<?php

namespace App\Payments\Dana;

use App\Payments\Dana\Exceptions\DanaApiException;
use App\Payments\Snap\SnapJson;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Support\Facades\Log;
use InvalidArgumentException;

/**
 * Signed transport for every DANA SNAP call.
 *
 * Simpler than the DOKU client in one important way: DANA's QRIS Acquirer APIs
 * are authenticated by the RSA signature alone, so there is no access token to
 * fetch, cache, expire or retry around.
 *
 * It never retries. A QRIS generate replayed after a timeout could leave two
 * live invoices against one participant, and the caller is in a far better
 * position to decide what a timeout means than a transport layer is. Where a
 * retry is genuinely safe - the status query - the caller repeats the call
 * itself using the same partnerReferenceNo, as DANA's own guidance requires.
 */
final class DanaClient
{
    public function __construct(
        private readonly DanaCredentials $credentials,
        private readonly DanaExternalIdGenerator $externalIds,
        private readonly Http $http,
    ) {}

    /**
     * @param  array<string, mixed>  $body
     * @return array{body: array<string, mixed>, external_id: string, http_status: int}
     */
    public function post(string $path, array $body, ?string $externalId = null): array
    {
        $externalId ??= $this->externalIds->generate();

        try {
            // The signature covers these exact bytes, so these exact bytes are
            // what gets sent - never a re-encoding of the same array.
            $encoded = SnapJson::encode($body);
        } catch (InvalidArgumentException $e) {
            throw new DanaApiException(
                context: ['reason' => 'Request body could not be encoded.', 'path' => $path],
                previous: $e,
            );
        }

        $timestamp = DanaSignature::timestamp();
        $signature = DanaSignature::sign(
            DanaSignature::transactionStringToSign('POST', $path, DanaSignature::hashBody($encoded), $timestamp),
            $this->credentials->privateKey(),
        );

        $headers = array_filter([
            'X-TIMESTAMP' => $timestamp,
            'X-SIGNATURE' => $signature,
            'X-PARTNER-ID' => $this->credentials->partnerId,
            'X-EXTERNAL-ID' => $externalId,
            'CHANNEL-ID' => $this->credentials->channelId,
            'ORIGIN' => $this->credentials->origin,
        ], static fn (?string $value): bool => $value !== null && $value !== '');

        $startedAt = microtime(true);

        try {
            $response = $this->http
                ->withBody($encoded, 'application/json')
                ->acceptJson()
                ->withHeaders($headers)
                ->connectTimeout($this->credentials->connectTimeout)
                ->timeout($this->credentials->timeout)
                ->post($this->credentials->baseUrl.$path);
        } catch (ConnectionException $e) {
            /*
             * A timeout is not proof that nothing happened. DANA may have
             * created the order and lost the reply, so this is reported as a
             * failure to the payer while the invoice stays pending and
             * reconciliation settles what really occurred.
             */
            Log::channel('dana')->error('DANA request did not complete', [
                'path' => $path,
                'external_id' => $externalId,
                'duration_ms' => (int) ((microtime(true) - $startedAt) * 1000),
                'error' => $e->getMessage(),
            ]);

            throw new DanaApiException(
                context: ['reason' => 'The DANA request did not complete.', 'path' => $path, 'external_id' => $externalId],
                previous: $e,
            );
        }

        $decoded = $response->json();

        Log::channel('dana')->info('DANA request', [
            'path' => $path,
            'external_id' => $externalId,
            'http_status' => $response->status(),
            'duration_ms' => (int) ((microtime(true) - $startedAt) * 1000),
            'response_code' => is_array($decoded) ? ($decoded['responseCode'] ?? null) : null,
            'response_message' => is_array($decoded) ? ($decoded['responseMessage'] ?? null) : null,
        ]);

        if (! is_array($decoded)) {
            throw new DanaApiException(context: [
                'reason' => 'DANA returned a body that is not JSON.',
                'path' => $path,
                'external_id' => $externalId,
                'http_status' => $response->status(),
            ]);
        }

        return [
            'body' => $decoded,
            'external_id' => $externalId,
            'http_status' => $response->status(),
        ];
    }
}
