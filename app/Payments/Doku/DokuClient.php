<?php

namespace App\Payments\Doku;

use App\Payments\Doku\Exceptions\DokuApiException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Log;

/**
 * Signed transport for every DOKU SNAP transaction call.
 *
 * Builds the six SNAP headers, sends the exact bytes that were signed, and
 * retries once - and only once - when DOKU says the access token is no longer
 * good. It never retries anything else: replaying a QR generate call without an
 * idempotency guarantee would risk two live invoices for one participant.
 */
final class DokuClient
{
    /** DOKU signals an unusable token with these response codes. */
    private const TOKEN_FAILURE_CODES = ['4010000', '4010001', '4012400', '4012401', '4017300'];

    public function __construct(
        private readonly DokuCredentials $credentials,
        private readonly DokuAccessToken $token,
        private readonly DokuExternalIdGenerator $externalIds,
        private readonly Http $http,
    ) {}

    /**
     * @param  array<string, mixed>  $body
     * @return array{body: array<string, mixed>, external_id: string, http_status: int}
     */
    public function post(string $path, array $body, ?string $externalId = null): array
    {
        $externalId ??= $this->externalIds->generate();

        $result = $this->send($path, $body, $externalId, $this->token->get());

        if ($this->looksLikeTokenFailure($result)) {
            // One retry with a fresh token, then give up.
            $this->token->forget();
            $result = $this->send($path, $body, $externalId, $this->token->refresh());
        }

        return $result;
    }

    /**
     * @param  array<string, mixed>  $body
     * @return array{body: array<string, mixed>, external_id: string, http_status: int}
     */
    private function send(string $path, array $body, string $externalId, string $accessToken): array
    {
        // The signature covers these exact bytes, so the same string is sent.
        $encoded = json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        if ($encoded === false) {
            throw new DokuApiException(context: ['reason' => 'Request body could not be encoded.', 'path' => $path]);
        }

        $timestamp = DokuSignature::timestamp();
        $signature = DokuSignature::symmetric(
            DokuSignature::transactionStringToSign(
                'POST',
                $path,
                $accessToken,
                DokuSignature::hashBody($encoded),
                $timestamp,
            ),
            $this->credentials->clientSecret(),
        );

        $startedAt = microtime(true);

        try {
            $response = $this->http
                ->withBody($encoded, 'application/json')
                ->acceptJson()
                ->connectTimeout($this->credentials->connectTimeout)
                ->timeout($this->credentials->timeout)
                ->withHeaders([
                    'Authorization' => 'Bearer '.$accessToken,
                    'X-PARTNER-ID' => $this->credentials->clientId,
                    'X-EXTERNAL-ID' => $externalId,
                    'X-TIMESTAMP' => $timestamp,
                    'X-SIGNATURE' => $signature,
                    'CHANNEL-ID' => $this->credentials->channelId,
                ])
                ->post($this->credentials->baseUrl.$path);
        } catch (ConnectionException $e) {
            $this->log($path, $externalId, null, $startedAt, null, 'connection failed');

            throw new DokuApiException(
                'Pembayaran belum bisa dibuat. Silakan coba lagi beberapa saat.',
                ['reason' => 'Could not reach DOKU.', 'path' => $path, 'external_id' => $externalId],
                $e,
            );
        }

        $decoded = $response->json();
        $decoded = is_array($decoded) ? $decoded : [];

        $this->log($path, $externalId, $response, $startedAt, $decoded['responseCode'] ?? null);

        return [
            'body' => $decoded,
            'external_id' => $externalId,
            'http_status' => $response->status(),
        ];
    }

    /** @param array{body: array<string, mixed>, http_status: int} $result */
    private function looksLikeTokenFailure(array $result): bool
    {
        if ($result['http_status'] === 401) {
            return true;
        }

        return in_array((string) ($result['body']['responseCode'] ?? ''), self::TOKEN_FAILURE_CODES, true);
    }

    /** Records what was called and how it went - never the token or signature. */
    private function log(
        string $path,
        string $externalId,
        ?Response $response,
        float $startedAt,
        ?string $responseCode,
        ?string $note = null,
    ): void {
        Log::channel('doku')->info('DOKU request', array_filter([
            'endpoint' => $path,
            'external_id' => $externalId,
            'http_status' => $response?->status(),
            'response_code' => $responseCode,
            'latency_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'note' => $note,
        ], static fn ($value) => $value !== null));
    }
}
