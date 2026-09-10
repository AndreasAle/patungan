<?php

namespace App\Payments\Dana;

use App\Payments\InboundWebhook;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Decides whether an inbound DANA notification is genuinely from DANA.
 *
 * This class is the entire reason an organizer's balance can be trusted. The
 * notification endpoint is public - anyone on the internet can post to it - and
 * the only thing separating a real settlement from a forged one is the RSA
 * signature checked here against DANA's public key.
 *
 * DANA is unambiguous about the scheme, unlike DOKU: Finish Notify is signed
 * with the asymmetric method, over
 *
 *     METHOD + ":" + path + ":" + lowercase(hex(sha256(minify(body)))) + ":" + timestamp
 *
 * So there is exactly one accepted path here, and no fallback. A fallback would
 * mean a second way to get money credited, and there is no evidence a second
 * way exists.
 *
 * Everything else - amount agreement, reference lookup, idempotency - is checked
 * downstream in WebhookProcessor and PaymentService. This answers one question:
 * did DANA send this?
 */
final class DanaNotificationVerifier
{
    /**
     * How far a notification's timestamp may drift before it is refused.
     *
     * Bounds replay: a signature captured today cannot be posted back next week
     * to credit a payment a second time. Fifteen minutes is generous enough for
     * a slow retry and clock drift between two servers.
     */
    private const MAX_CLOCK_SKEW_SECONDS = 900;

    public function __construct(private readonly DanaCredentials $credentials) {}

    public function verify(InboundWebhook $webhook): bool
    {
        $signature = $webhook->header('X-SIGNATURE');
        $timestamp = $webhook->header('X-TIMESTAMP');

        if ($signature === null || $timestamp === null) {
            return false;
        }

        if (! $this->timestampIsFresh($timestamp)) {
            Log::channel('dana')->warning('DANA notification rejected: stale timestamp', [
                'external_id' => $webhook->header('X-EXTERNAL-ID'),
            ]);

            return false;
        }

        $partnerId = $webhook->header('X-PARTNER-ID');

        if ($partnerId !== null && ! hash_equals($this->credentials->partnerId, $partnerId)) {
            Log::channel('dana')->warning('DANA notification rejected: partner id mismatch', [
                'external_id' => $webhook->header('X-EXTERNAL-ID'),
            ]);

            return false;
        }

        try {
            $publicKey = $this->credentials->danaPublicKey();
        } catch (Throwable $e) {
            Log::channel('dana')->error('DANA notification could not be verified: public key unreadable', [
                'reason' => $e->getMessage(),
            ]);

            return false;
        }

        if ($publicKey === null) {
            /*
             * Refused, not accepted. Without DANA's public key there is no way
             * to tell a settlement from a forgery, and an unverifiable
             * notification must never move money. Payments still settle through
             * reconciliation, which asks DANA directly.
             */
            Log::channel('dana')->error('DANA notification refused: no DANA public key is configured');

            return false;
        }

        $bodyHash = DanaSignature::hashBody($webhook->rawBody);

        foreach ($this->candidatePaths($webhook) as $path) {
            $stringToSign = DanaSignature::transactionStringToSign(
                $webhook->method,
                $path,
                $bodyHash,
                $timestamp,
            );

            if (DanaSignature::verify($signature, $stringToSign, $publicKey)) {
                return true;
            }
        }

        Log::channel('dana')->warning('DANA notification rejected: signature did not verify', [
            'external_id' => $webhook->header('X-EXTERNAL-ID'),
            'path' => $webhook->path,
        ]);

        return false;
    }

    /**
     * The path DANA signed is the one registered in their portal. Behind a
     * proxy that rewrites a prefix it can differ from what this application
     * sees, so the configured notification URL is tried as well.
     *
     * Both candidates are paths we chose ourselves. Neither is taken from the
     * request, so this cannot be used to make an arbitrary signature verify.
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
