<?php

namespace App\Payments\Payouts;

use App\Contracts\PayoutProvider;
use App\Models\Settlement;
use App\Payments\Doku\Exceptions\DokuPaymentException;
use App\Payments\PayoutResult;

/**
 * Kirim DOKU (disbursement).
 *
 * DOKU has to enable this service on the merchant before any transfer API can
 * be called, so until DOKU_ENABLE_PAYOUT is switched on this provider refuses
 * every request rather than pretending a transfer happened. A settlement that
 * silently reports COMPLETED without money moving is the one failure mode this
 * product cannot have.
 *
 * When the service is enabled the flow is:
 *   account inquiry -> transfer -> PROCESSING -> provider confirmation
 * and never REQUESTED -> COMPLETED on the strength of an accepted HTTP call.
 */
final class DokuPayoutProvider implements PayoutProvider
{
    public function __construct(private readonly bool $enabled) {}

    public function name(): string
    {
        return 'doku';
    }

    public function isAutomated(): bool
    {
        // Honest answer: nothing is automated until DOKU activates the service.
        return $this->enabled;
    }

    public function createPayout(Settlement $settlement): PayoutResult
    {
        $this->guard();

        throw new DokuPaymentException(
            'Pencairan otomatis lewat DOKU belum aktif.',
            ['reason' => 'Kirim DOKU transfer is not implemented yet; the merchant service is not active.'],
        );
    }

    public function getPayoutStatus(Settlement $settlement): PayoutResult
    {
        $this->guard();

        throw new DokuPaymentException(
            'Pencairan otomatis lewat DOKU belum aktif.',
            ['reason' => 'Kirim DOKU status query is not implemented yet.'],
        );
    }

    public function handleWebhook(array $payload, string $rawBody): ?PayoutResult
    {
        // No payout notifications can arrive while the service is off.
        return null;
    }

    private function guard(): void
    {
        if ($this->enabled) {
            return;
        }

        throw new DokuPaymentException(
            'Pencairan sedang dipersiapkan. Tim Patungan akan memprosesnya secara manual.',
            ['reason' => 'DOKU_ENABLE_PAYOUT is false.'],
        );
    }
}
