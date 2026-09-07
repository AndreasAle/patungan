<?php

namespace App\Payments\Doku;

use App\Payments\Doku\Exceptions\DokuAuthenticationException;
use Illuminate\Contracts\Cache\Repository as Cache;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory as Http;
use Illuminate\Support\Facades\Log;

/**
 * The SNAP B2B access token, fetched once and cached until shortly before it
 * expires. Every transaction call reuses it rather than asking for a new one.
 */
final class DokuAccessToken
{
    public const ENDPOINT = '/authorization/v1/access-token/b2b';

    private const CACHE_KEY = 'doku:b2b_access_token';

    /** Renew this many seconds before DOKU would expire the token. */
    private const SAFETY_MARGIN = 60;

    public function __construct(
        private readonly DokuCredentials $credentials,
        private readonly Cache $cache,
        private readonly Http $http,
    ) {}

    public function get(): string
    {
        $cached = $this->cache->get($this->cacheKey());

        if (is_string($cached) && $cached !== '') {
            return $cached;
        }

        return $this->refresh();
    }

    /** Drops the cached token so the next call fetches a fresh one. */
    public function forget(): void
    {
        $this->cache->forget($this->cacheKey());
    }

    public function refresh(): string
    {
        $timestamp = DokuSignature::timestamp();
        $signature = DokuSignature::asymmetric($this->credentials->clientId, $timestamp, $this->credentials->privateKey());

        try {
            $response = $this->http
                ->asJson()
                ->acceptJson()
                ->connectTimeout($this->credentials->connectTimeout)
                ->timeout($this->credentials->timeout)
                ->withHeaders([
                    'X-SIGNATURE' => $signature,
                    'X-TIMESTAMP' => $timestamp,
                    'X-CLIENT-KEY' => $this->credentials->clientId,
                ])
                ->post($this->credentials->baseUrl.self::ENDPOINT, ['grantType' => 'client_credentials']);
        } catch (ConnectionException $e) {
            throw new DokuAuthenticationException(
                'Pembayaran belum bisa dibuat. Silakan coba lagi beberapa saat.',
                ['reason' => 'Could not reach DOKU for a B2B token.'],
                $e,
            );
        }

        $body = $response->json();

        if (! is_array($body) || ! is_string($body['accessToken'] ?? null) || $body['accessToken'] === '') {
            Log::channel('doku')->error('DOKU B2B token rejected', [
                'endpoint' => self::ENDPOINT,
                'http_status' => $response->status(),
                'response_code' => is_array($body) ? ($body['responseCode'] ?? null) : null,
                'response_message' => is_array($body) ? ($body['responseMessage'] ?? null) : null,
            ]);

            throw new DokuAuthenticationException(context: [
                'reason' => 'DOKU did not return an access token.',
                'http_status' => $response->status(),
            ]);
        }

        $token = $body['accessToken'];
        $expiresIn = (int) ($body['expiresIn'] ?? 900);
        $ttl = max(30, $expiresIn - self::SAFETY_MARGIN);

        $this->cache->put($this->cacheKey(), $token, $ttl);

        return $token;
    }

    /**
     * Sandbox and production tokens must never share a cache entry, and neither
     * may two merchants pointed at the same Redis.
     */
    private function cacheKey(): string
    {
        return self::CACHE_KEY.':'.sha1($this->credentials->baseUrl.'|'.$this->credentials->clientId);
    }
}
