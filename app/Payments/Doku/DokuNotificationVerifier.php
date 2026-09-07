<?php

namespace App\Payments\Doku;

use App\Payments\InboundWebhook;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Decides whether an inbound DOKU notification is genuinely from DOKU.
 *
 * DOKU documents two different things and we honour both, because getting this
 * wrong in either direction is expensive:
 *
 *  - The symmetric scheme on the signature reference page: HMAC-SHA512 over
 *    method:path:token:bodyHash:timestamp, keyed with our client secret.
 *  - The asymmetric check their official PHP SDK performs on notifications:
 *    SHA256withRSA over "clientId|timestamp", verified with DOKU's public key.
 *
 * A notification is accepted when either verifies. That is not a weakening:
 * both require a secret an attacker does not have (our client secret, or
 * DOKU's private key). What it avoids is rejecting real money movements
 * because the documentation and the SDK disagree.
 *
 * Everything else - amount, reference, idempotency - is checked downstream by
 * WebhookProcessor and PaymentService.
 */
final class DokuNotificationVerifier
{
    /** How far a notification's timestamp may drift before we refuse it. */
    private const MAX_CLOCK_SKEW_SECONDS = 900;

    public function __construct(private readonly DokuCredentials $credentials) {}

    public function verify(InboundWebhook $webhook): bool
    {
        $signature = $webhook->header('X-SIGNATURE');
        $timestamp = $webhook->header('X-TIMESTAMP');

        if ($signature === null || $timestamp === null) {
            return false;
        }

        if (! $this->timestampIsFresh($timestamp)) {
            Log::channel('doku')->warning('DOKU notification rejected: stale timestamp', [
                'external_id' => $webhook->header('X-EXTERNAL-ID'),
            ]);

            return false;
        }

        $partnerId = $webhook->header('X-PARTNER-ID');

        if ($partnerId !== null && ! hash_equals($this->credentials->clientId, $partnerId)) {
            Log::channel('doku')->warning('DOKU notification rejected: partner id mismatch', [
                'external_id' => $webhook->header('X-EXTERNAL-ID'),
            ]);

            return false;
        }

        return $this->asymmetricPasses($signature, $timestamp)
            || $this->symmetricPasses($webhook, $signature, $timestamp);
    }

    private function asymmetricPasses(string $signature, string $timestamp): bool
    {
        try {
            $publicKey = $this->credentials->dokuPublicKey();
        } catch (Throwable) {
            return false;
        }

        if ($publicKey === null) {
            return false;
        }

        return DokuSignature::asymmetricMatches($signature, $this->credentials->clientId, $timestamp, $publicKey);
    }

    private function symmetricPasses(InboundWebhook $webhook, string $signature, string $timestamp): bool
    {
        $bodyHash = DokuSignature::hashBody($webhook->rawBody);
        $secret = $this->credentials->clientSecret();

        foreach ($this->candidatePaths($webhook) as $path) {
            foreach ($this->candidateTokens($webhook) as $token) {
                $stringToSign = DokuSignature::transactionStringToSign(
                    $webhook->method,
                    $path,
                    $token,
                    $bodyHash,
                    $timestamp,
                );

                if (DokuSignature::symmetricMatches($signature, $stringToSign, $secret)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * The path DOKU signed is the one registered in their dashboard. Behind a
     * proxy that rewrites the prefix it may differ from what we see, so the
     * configured notification URL is tried as well as the observed path.
     *
     * @return list<string>
     */
    private function candidatePaths(InboundWebhook $webhook): array
    {
        $paths = [$webhook->path];
        $configured = $this->credentials->notificationPath();

        if ($configured !== null && $configured !== $webhook->path) {
            $paths[] = $configured;
        }

        return $paths;
    }

    /**
     * DOKU's documented string includes an access token component. For an
     * inbound call the token is whatever DOKU put in the Authorization header,
     * and some deployments send none at all.
     *
     * @return list<string>
     */
    private function candidateTokens(InboundWebhook $webhook): array
    {
        $tokens = [''];

        $authorization = $webhook->header('Authorization');

        if ($authorization !== null) {
            $bare = preg_replace('/^Bearer\s+/i', '', $authorization) ?? $authorization;

            if ($bare !== '') {
                array_unshift($tokens, $bare);
            }
        }

        return $tokens;
    }

    private function timestampIsFresh(string $timestamp): bool
    {
        try {
            $sentAt = CarbonImmutable::parse($timestamp);
        } catch (Throwable) {
            return false;
        }

        return abs($sentAt->diffInSeconds(CarbonImmutable::now())) <= self::MAX_CLOCK_SKEW_SECONDS;
    }
}
