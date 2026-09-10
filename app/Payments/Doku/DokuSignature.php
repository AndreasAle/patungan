<?php

namespace App\Payments\Doku;

use App\Payments\Doku\Exceptions\DokuSignatureException;
use App\Payments\Snap\SnapJson;

/**
 * The two SNAP signature schemes, kept free of HTTP and config so they can be
 * asserted directly against the worked examples in DOKU's documentation.
 *
 * Asymmetric (SHA256withRSA, our private key) signs the B2B token request:
 *
 *     clientId + "|" + timestamp
 *
 * Symmetric (HMAC-SHA512, the client secret) signs every transaction request:
 *
 *     method + ":" + path + ":" + accessToken + ":"
 *            + lowercase(hex(sha256(minify(body)))) + ":" + timestamp
 *
 * Both are base64 encoded.
 */
final class DokuSignature
{
    /**
     * Hash of the request body exactly as DOKU specifies: the JSON is minified
     * first, then SHA-256, hex encoded, lower cased.
     *
     * Minified means no insignificant whitespace. Re-encoding a decoded payload
     * would reorder nothing but could change escaping, so a raw body is hashed
     * as-is once whitespace between tokens is removed.
     */
    public static function hashBody(string $body): string
    {
        return SnapJson::hashBody($body);
    }

    /** @param array<string, mixed> $body */
    public static function hashArrayBody(array $body): string
    {
        try {
            return self::hashBody(SnapJson::encode($body));
        } catch (\InvalidArgumentException $e) {
            throw new DokuSignatureException(context: ['reason' => 'Request body could not be encoded.'], previous: $e);
        }
    }

    /**
     * Strips whitespace that sits between JSON tokens, leaving whitespace inside
     * string literals untouched. An empty body hashes as the SHA-256 of "".
     */
    public static function minify(string $json): string
    {
        return SnapJson::minify($json);
    }

    /** The exact string DOKU expects to be signed for a transaction request. */
    public static function transactionStringToSign(
        string $method,
        string $path,
        string $accessToken,
        string $bodyHash,
        string $timestamp,
    ): string {
        return strtoupper($method).':'.$path.':'.$accessToken.':'.$bodyHash.':'.$timestamp;
    }

    /** HMAC-SHA512 with the client secret, base64 encoded. */
    public static function symmetric(string $stringToSign, string $clientSecret): string
    {
        return base64_encode(hash_hmac('sha512', $stringToSign, $clientSecret, true));
    }

    public static function symmetricMatches(string $candidate, string $stringToSign, string $clientSecret): bool
    {
        return hash_equals(self::symmetric($stringToSign, $clientSecret), $candidate);
    }

    /** SHA256withRSA over "clientId|timestamp", base64 encoded. */
    public static function asymmetric(string $clientId, string $timestamp, string $privateKeyPem): string
    {
        $key = openssl_pkey_get_private($privateKeyPem);

        if ($key === false) {
            throw new DokuSignatureException(context: [
                'reason' => 'The configured DOKU private key could not be read.',
                'openssl' => openssl_error_string(),
            ]);
        }

        $signature = '';

        if (! openssl_sign($clientId.'|'.$timestamp, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new DokuSignatureException(context: [
                'reason' => 'Signing the DOKU token request failed.',
                'openssl' => openssl_error_string(),
            ]);
        }

        return base64_encode($signature);
    }

    /** Verifies a "clientId|timestamp" signature against DOKU's public key. */
    public static function asymmetricMatches(
        string $candidate,
        string $clientId,
        string $timestamp,
        string $publicKeyPem,
    ): bool {
        $key = openssl_pkey_get_public($publicKeyPem);

        if ($key === false) {
            return false;
        }

        $raw = base64_decode($candidate, true);

        if ($raw === false) {
            return false;
        }

        return openssl_verify($clientId.'|'.$timestamp, $raw, $key, OPENSSL_ALGO_SHA256) === 1;
    }

    /**
     * ISO-8601 with an offset, e.g. 2026-09-07T14:18:39+07:00.
     *
     * Carbon already carries the application timezone once Laravel has booted,
     * and no config is read here so the signature stays testable in isolation.
     */
    public static function timestamp(?\DateTimeInterface $at = null): string
    {
        return SnapJson::timestamp($at);
    }
}
