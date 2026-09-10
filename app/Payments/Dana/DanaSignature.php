<?php

namespace App\Payments\Dana;

use App\Payments\Dana\Exceptions\DanaSignatureException;
use App\Payments\Snap\SnapJson;

/**
 * DANA's SNAP signatures.
 *
 * DANA differs from DOKU in the one place it matters: every QRIS Acquirer call
 * is signed asymmetrically with our RSA private key, and there is no B2B access
 * token in the picture at all. From DANA's own reference, the string signed for
 * a transaction is:
 *
 *     METHOD + ":" + relativePath + ":"
 *            + lowercase(hex(sha256(minify(body)))) + ":" + timestamp
 *
 * signed with SHA256withRSA and base64 encoded into X-SIGNATURE.
 *
 * The same string and the same algorithm are used in reverse to verify the
 * notifications DANA sends us, against DANA's public key. That is the whole
 * security model here: if the verification fails, the money did not come from
 * DANA, and nothing may be credited.
 *
 * Kept free of HTTP and config so it can be asserted directly against the
 * worked examples in the documentation.
 */
final class DanaSignature
{
    /** lowercase(hex(sha256(minify(body)))). */
    public static function hashBody(string $body): string
    {
        return SnapJson::hashBody($body);
    }

    /** The exact string DANA expects to be signed for a transaction request. */
    public static function transactionStringToSign(
        string $method,
        string $path,
        string $bodyHash,
        string $timestamp,
    ): string {
        return strtoupper($method).':'.$path.':'.$bodyHash.':'.$timestamp;
    }

    /** The string signed when applying for a token: clientId + "|" + timestamp. */
    public static function tokenStringToSign(string $clientId, string $timestamp): string
    {
        return $clientId.'|'.$timestamp;
    }

    /**
     * SHA256withRSA with our private key, base64 encoded.
     *
     * Accepts PKCS#1 and PKCS#8 keys; DANA's own guide hands out both depending
     * on which language sample you follow, and openssl reads either.
     */
    public static function sign(string $stringToSign, string $privateKeyPem): string
    {
        $key = openssl_pkey_get_private($privateKeyPem);

        if ($key === false) {
            throw new DanaSignatureException(context: [
                'reason' => 'The configured DANA private key could not be read.',
                'openssl' => openssl_error_string(),
            ]);
        }

        $signature = '';

        if (! openssl_sign($stringToSign, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new DanaSignatureException(context: [
                'reason' => 'Signing the DANA request failed.',
                'openssl' => openssl_error_string(),
            ]);
        }

        return base64_encode($signature);
    }

    /**
     * Verifies a signature against DANA's public key.
     *
     * Returns false rather than throwing on every malformed input. A bad
     * signature is an ordinary event on a public endpoint - anyone can post to
     * it - and it must be answered with a refusal, not an exception trace.
     */
    public static function verify(string $candidate, string $stringToSign, string $publicKeyPem): bool
    {
        $key = openssl_pkey_get_public($publicKeyPem);

        if ($key === false) {
            return false;
        }

        $raw = base64_decode($candidate, true);

        if ($raw === false || $raw === '') {
            return false;
        }

        return openssl_verify($stringToSign, $raw, $key, OPENSSL_ALGO_SHA256) === 1;
    }

    /** ISO-8601 with a GMT+7 offset, which DANA requires on every request. */
    public static function timestamp(?\DateTimeInterface $at = null): string
    {
        return SnapJson::timestamp($at);
    }
}
