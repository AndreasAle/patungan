<?php

namespace App\Console\Commands;

use App\Enums\PaymentStatus;
use App\Models\Payment;
use App\Payments\PaymentGatewayManager;
use App\Services\PaymentService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Catches payments the provider settled but whose notification never arrived.
 *
 * The webhook stays the primary signal; this only looks at invoices that have
 * been pending long enough that a notification should already have landed, and
 * only a bounded number of them per run, so a backlog never turns into a storm
 * of provider calls.
 */
class ReconcilePendingPayments extends Command
{
    protected $signature = 'payments:reconcile
        {--minutes=3 : Only look at payments pending at least this long}
        {--limit=100 : Most payments to query in one run}';

    protected $description = 'Ask the payment gateway about payments whose webhook has not arrived';

    public function handle(PaymentGatewayManager $gateways, PaymentService $payments): int
    {
        $minutes = max(1, (int) $this->option('minutes'));
        $limit = max(1, (int) $this->option('limit'));

        $pending = Payment::query()
            ->where('status', PaymentStatus::Pending->value)
            ->where('created_at', '<=', now()->subMinutes($minutes))
            // Oldest first, so nothing is starved out by a busy tail.
            ->orderBy('created_at')
            ->limit($limit)
            ->get();

        $settled = 0;
        $checked = 0;

        foreach ($pending as $payment) {
            try {
                $gateway = $gateways->driver($payment->gateway);
            } catch (Throwable) {
                continue;
            }

            $checked++;

            try {
                $event = $gateway->fetchStatus($payment);
            } catch (Throwable $e) {
                Log::channel('doku')->warning('Reconciliation query failed', [
                    'payment' => $payment->uuid,
                    'gateway' => $payment->gateway,
                ]);

                continue;
            }

            if ($event === null || ! $event->signatureValid || $event->status === PaymentStatus::Pending) {
                continue;
            }

            // The same guard the webhook path uses: never credit an amount that
            // disagrees with the invoice we issued.
            if ($event->status === PaymentStatus::Paid && $event->grossAmount !== $payment->charged_amount) {
                Log::error('PAYMENT_AMOUNT_MISMATCH during reconciliation', [
                    'payment' => $payment->uuid,
                    'expected' => $payment->charged_amount,
                    'received' => $event->grossAmount,
                ]);

                continue;
            }

            $applied = $event->status === PaymentStatus::Paid
                ? $payments->markAsPaid($payment, $event->transactionId, $event->raw)
                : $payments->markAsFinal($payment, $event->status, $event->raw);

            if ($applied) {
                $settled++;
            }
        }

        $this->info("Checked {$checked} pending payment(s), settled {$settled}.");

        return self::SUCCESS;
    }
}
