<?php

namespace App\Support;

use App\Enums\LedgerDirection;
use App\Enums\LedgerType;
use App\Enums\ParticipantStatus;
use App\Enums\PaymentStatus;
use App\Enums\SettlementStatus;
use App\Models\PatunganParticipant;
use App\Models\Payment;
use App\Models\Settlement;
use App\Models\WalletLedger;
use App\Models\WebhookLog;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * What an operator needs to know before anything else: are the books right, and
 * is anything stuck.
 *
 * The admin dashboard was ten lifetime totals. Lifetime totals cannot answer the
 * only two questions that matter at 2am - "is money missing" and "is something
 * broken right now" - because a number that only ever grows looks identical
 * whether the platform is healthy or has been failing quietly for a week.
 *
 * Every check here is falsifiable. Each states something that must be true and
 * counts the rows where it is not, rather than producing a score. A green light
 * that cannot go red is decoration.
 */
class PlatformHealth
{
    /** A payout still unsettled after this long needs a human. */
    private const STUCK_SETTLEMENT_HOURS = 24;

    /**
     * The ledger arithmetic, checked against a source that is not the ledger.
     *
     * Deriving "expected" from wallet_ledgers would prove only that addition
     * works, so it is rebuilt from payments and settlements instead:
     *
     *   every PAID payment credits charged_amount and debits its two fees,
     *   which nets to exactly net_amount;
     *
     *   every settlement debits amount at the moment it is *requested* - not
     *   when it completes - and a FAILED or REJECTED one is credited back in
     *   full. So the settlements still holding money are all of them except
     *   those two states.
     *
     * Any drift means money was credited twice or left without being recorded,
     * and nothing else on this page matters until it is explained.
     *
     * @return array{balanced: bool, credits: int, debits: int, net: int, expected: int, drift: int}
     */
    public function ledgerIntegrity(): array
    {
        $credits = (int) WalletLedger::query()
            ->where('direction', LedgerDirection::Credit->value)
            ->sum('amount');

        $debits = (int) WalletLedger::query()
            ->where('direction', LedgerDirection::Debit->value)
            ->sum('amount');

        $paid = (int) Payment::query()
            ->where('status', PaymentStatus::Paid->value)
            ->sum('net_amount');

        $heldForPayout = (int) Settlement::query()
            ->whereNotIn('status', [
                SettlementStatus::Failed->value,
                SettlementStatus::Rejected->value,
            ])
            ->sum('amount');

        $net = $credits - $debits;
        $expected = $paid - $heldForPayout;

        return [
            'balanced' => $net === $expected,
            'credits' => $credits,
            'debits' => $debits,
            'net' => $net,
            'expected' => $expected,
            'drift' => $net - $expected,
        ];
    }

    /**
     * Things that should not be able to happen, and how often they have.
     *
     * Each entry names the invariant rather than the symptom, because an
     * operator reading this at speed needs to know what is broken, not what it
     * looks like.
     *
     * Each carries the link to the rows it counted where one exists. A number
     * an operator cannot click is a number they have to go hunting for by hand,
     * which in practice means they do not.
     *
     * @return list<array{key: string, label: string, detail: string, count: int, severity: string, href: string|null}>
     */
    public function anomalies(): array
    {
        return [
            [
                'key' => 'paid_without_ledger',
                'label' => 'Pembayaran lunas tanpa catatan ledger',
                'detail' => 'Uang masuk tapi saldo penyelenggara tidak pernah dikredit.',
                'count' => $this->paidWithoutLedger(),
                'severity' => 'critical',
                'href' => route('admin.payments', ['status' => PaymentStatus::Paid->value]),
            ],
            [
                'key' => 'stuck_settlement',
                'label' => 'Pencairan tertahan',
                'detail' => 'Belum selesai lebih dari '.self::STUCK_SETTLEMENT_HOURS.' jam, padahal saldo sudah dipotong.',
                'count' => $this->stuckSettlements(),
                'severity' => 'critical',
                'href' => route('admin.settlements', ['status' => SettlementStatus::Processing->value]),
            ],
            [
                'key' => 'participant_paid_twice',
                'label' => 'Peserta membayar dua kali',
                'detail' => 'Dua pembayaran lunas untuk satu orang. Uangnya nyata dan sudah dikredit - perlu dikembalikan.',
                'count' => $this->participantsPaidTwice(),
                'severity' => 'critical',
                'href' => route('admin.payments', ['status' => PaymentStatus::Paid->value]),
            ],
            [
                'key' => 'participant_paid_no_payment',
                'label' => 'Peserta lunas tanpa pembayaran',
                'detail' => 'Ditandai lunas manual, atau pembayarannya hilang.',
                'count' => $this->participantsPaidWithoutPayment(),
                'severity' => 'warning',
                'href' => null,
            ],
            [
                'key' => 'stuck_pending',
                'label' => 'Pembayaran pending lewat kedaluwarsa',
                'detail' => 'Slot invoice peserta tertahan; biasanya penjadwal tidak jalan.',
                'count' => $this->stuckPending(),
                'severity' => 'warning',
                'href' => route('admin.payments', ['status' => PaymentStatus::Pending->value]),
            ],
            [
                'key' => 'webhook_failed',
                'label' => 'Webhook gagal 24 jam terakhir',
                'detail' => 'Pembayaran mungkin sudah masuk tapi belum tercatat.',
                'count' => $this->recentWebhookFailures(),
                'severity' => 'warning',
                'href' => route('admin.webhooks', ['status' => WebhookLog::STATUS_FAILED]),
            ],
            [
                'key' => 'queue_backlog',
                'label' => 'Antrean menumpuk',
                'detail' => 'Notifikasi ke penyelenggara tertahan. Pastikan worker jalan.',
                'count' => $this->queueDepth(),
                'severity' => 'warning',
                'href' => null,
            ],
            [
                'key' => 'failed_jobs',
                'label' => 'Job gagal',
                'detail' => 'Sudah dicoba ulang sampai batas dan menyerah.',
                'count' => $this->failedJobs(),
                'severity' => 'warning',
                'href' => null,
            ],
        ];
    }

    /**
     * Settled money with no matching credit.
     *
     * The worst state this system can reach: the payer was charged and the
     * organizer balance never moved. Matched on payment_id rather than the
     * reference string, because a foreign key cannot drift.
     */
    private function paidWithoutLedger(): int
    {
        return Payment::query()
            ->where('status', PaymentStatus::Paid->value)
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('wallet_ledgers')
                    ->whereColumn('wallet_ledgers.payment_id', 'payments.id')
                    ->where('wallet_ledgers.type', LedgerType::PaymentReceived->value);
            })
            ->count();
    }

    /**
     * One participant, two settled payments.
     *
     * Possible because DANA refuses validityPeriod, so a QR outlives the
     * invoice it was issued for: somebody can pay the old QR and the
     * replacement. expireStalePayments cancels the old QR to prevent it, but a
     * cancel that fails leaves exactly this, and it is a real double charge
     * owed back to a real person.
     */
    private function participantsPaidTwice(): int
    {
        return Payment::query()
            ->where('status', PaymentStatus::Paid->value)
            ->groupBy('participant_id')
            ->havingRaw('COUNT(*) > 1')
            ->pluck('participant_id')
            ->count();
    }

    private function participantsPaidWithoutPayment(): int
    {
        return PatunganParticipant::query()
            ->where('status', ParticipantStatus::Paid->value)
            ->whereNotExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('payments')
                    ->whereColumn('payments.participant_id', 'patungan_participants.id')
                    ->where('payments.status', PaymentStatus::Paid->value);
            })
            ->count();
    }

    private function stuckPending(): int
    {
        return Payment::query()
            ->where('status', PaymentStatus::Pending->value)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->count();
    }

    /**
     * Counted from requested_at, the one timestamp an admin action cannot
     * refresh - touching the row must not make a stuck payout look young.
     */
    private function stuckSettlements(): int
    {
        return Settlement::query()
            ->whereIn('status', [
                SettlementStatus::Pending->value,
                SettlementStatus::Processing->value,
            ])
            ->where('requested_at', '<', now()->subHours(self::STUCK_SETTLEMENT_HOURS))
            ->count();
    }

    private function recentWebhookFailures(): int
    {
        return WebhookLog::query()
            ->whereIn('status', [WebhookLog::STATUS_FAILED, WebhookLog::STATUS_REJECTED])
            ->where('created_at', '>=', now()->subDay())
            ->count();
    }

    /**
     * Queue depth, which only exists on the database driver. A missing table is
     * a configuration choice, not a fault, so it reports zero rather than
     * throwing.
     */
    private function queueDepth(): int
    {
        return $this->countTable('jobs');
    }

    private function failedJobs(): int
    {
        return $this->countTable('failed_jobs');
    }

    private function countTable(string $table): int
    {
        try {
            return DB::table($table)->count();
        } catch (Throwable) {
            return 0;
        }
    }
}
