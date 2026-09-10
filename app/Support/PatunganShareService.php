<?php

namespace App\Support;

use App\Enums\ParticipantStatus;
use App\Enums\PatunganCategory;
use App\Enums\ShareMessageType;
use App\Enums\SplitType;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use Illuminate\Support\Collection;

/**
 * Every message Patungan ever asks somebody to paste into WhatsApp.
 *
 * One class, on purpose. These strings are the product: they are what a payer
 * actually reads, and they get edited far more often than the code around them.
 * Scattered across controllers and React components they would drift, and the
 * reminder would end up phrased differently from the invite for no reason.
 *
 * Two rules hold throughout:
 *
 *  - Every figure comes from the database. Nothing here is passed in from a
 *    browser, so a message cannot be made to advertise an amount nobody owes.
 *  - Nothing is ever sent by this application. It composes text and hands it to
 *    the organizer, who presses send themselves. That is a deliberate product
 *    boundary, not a missing feature: an app that messages a WhatsApp group on
 *    its own is a spam machine, whatever it was built for.
 */
class PatunganShareService
{
    public function publicUrl(Patungan $patungan): string
    {
        return $patungan->publicUrl();
    }

    /**
     * A participant's own payment link.
     *
     * Issues the token if this participant does not have one yet, so the caller
     * never has to think about it.
     */
    public function personalUrl(Patungan $patungan, PatunganParticipant $participant): string
    {
        return route('public.payment.personal', [
            'token' => $patungan->public_token,
            'payToken' => $participant->payToken(),
        ]);
    }

    /**
     * "Here is the patungan." The one message that starts everything.
     */
    public function groupInvite(Patungan $patungan): string
    {
        return $this->lines([
            $this->heading($patungan),
            '',
            $this->perPerson($patungan),
            '',
            'Bayarnya lewat link ini ya:',
            $this->publicUrl($patungan),
            '',
            'Tinggal buka link → pilih nama → bayar QRIS.',
            'Nggak perlu login.',
        ]);
    }

    /**
     * "These people still owe."
     *
     * Returns null rather than an empty message when nobody does. A reminder
     * with no names in it is worse than no reminder: it is a message to a group
     * of people who have all already paid.
     */
    public function unpaidReminder(Patungan $patungan): ?string
    {
        $names = $this->remindableNames($patungan);

        if ($names->isEmpty()) {
            return null;
        }

        return $this->lines([
            'Masih ada yang belum bayar '.$this->shortTitle($patungan).' nih 👀',
            '',
            ...$names->all(),
            '',
            $this->perPerson($patungan),
            '',
            'Bayarnya di sini:',
            $this->publicUrl($patungan),
        ]);
    }

    /** "Six of eight have paid, here is what is left." */
    public function progress(Patungan $patungan): string
    {
        $paid = (int) $patungan->paid_participant_count;
        $total = (int) $patungan->participant_count;
        $outstanding = max($total - $paid, 0);

        $lines = [
            $this->heading($patungan),
            '',
            '✅ '.$paid.' orang sudah bayar',
        ];

        if ($outstanding > 0) {
            $lines[] = '⏳ '.$outstanding.' orang belum';
        }

        $lines[] = '';
        $lines[] = 'Terkumpul:';
        $lines[] = Money::format((int) $patungan->collected_amount).' / '.Money::format((int) $patungan->target_amount);

        if ($outstanding > 0) {
            $lines[] = '';
            $lines[] = 'Yang belum bisa bayar di sini:';
            $lines[] = $this->publicUrl($patungan);
        } else {
            $lines[] = '';
            $lines[] = 'Semua sudah beres. Makasih semuanya 🙌';
        }

        return $this->lines($lines);
    }

    /**
     * "Your bill is Rp25.000, here is your link."
     *
     * Friendly on purpose. This is a message between friends about a small
     * amount of money, and phrasing it like a collections notice is the fastest
     * way to make somebody stop using the product.
     */
    public function personalReminder(Patungan $patungan, PatunganParticipant $participant): string
    {
        return $this->lines([
            'Bro '.$participant->name.', '.$this->shortTitle($patungan).' tinggal pembayaran kamu ya 😄',
            '',
            Money::format((int) $participant->amount_due),
            '',
            'Bisa langsung bayar di sini:',
            $this->personalUrl($patungan, $participant),
            '',
            'Tinggal buka link lalu bayar QRIS.',
        ]);
    }

    /** What a payer can send back to the group once they are done. */
    public function paymentSuccess(Patungan $patungan, PatunganParticipant $participant): string
    {
        return $this->lines([
            $patungan->displayName($participant->name).' sudah bayar ✅',
            '',
            $this->heading($patungan),
        ]);
    }

    public function build(ShareMessageType $type, Patungan $patungan, ?PatunganParticipant $participant = null): ?string
    {
        return match ($type) {
            ShareMessageType::GroupInvite => $this->groupInvite($patungan),
            ShareMessageType::UnpaidReminder => $this->unpaidReminder($patungan),
            ShareMessageType::Progress => $this->progress($patungan),
            ShareMessageType::PersonalReminder => $participant === null
                ? null
                : $this->personalReminder($patungan, $participant),
            ShareMessageType::PaymentSuccess => $participant === null
                ? null
                : $this->paymentSuccess($patungan, $participant),
        };
    }

    /**
     * Who may still be chased, in display order.
     *
     * UNPAID always. PENDING only once its invoice has expired: while a QR is
     * still live the person is very likely staring at it, and chasing them at
     * that moment is both rude and confusing.
     *
     * @return Collection<int, PatunganParticipant>
     */
    public function remindable(Patungan $patungan): Collection
    {
        return $patungan->participants()
            ->with('activePayment')
            ->get()
            ->filter(function (PatunganParticipant $participant): bool {
                if ($participant->status === ParticipantStatus::Unpaid) {
                    return true;
                }

                if ($participant->status !== ParticipantStatus::Pending) {
                    return false;
                }

                $payment = $participant->activePayment;

                // No live invoice, or one that has run out: fair game again.
                return $payment === null || $payment->isExpired();
            })
            ->values();
    }

    /** @return Collection<int, string> */
    private function remindableNames(Patungan $patungan): Collection
    {
        return $this->remindable($patungan)
            ->map(fn (PatunganParticipant $participant): string => $patungan->displayName($participant->name));
    }

    /** The title with its category emoji, e.g. "🏸 Badminton Minggu Malam". */
    private function heading(Patungan $patungan): string
    {
        $emoji = $this->emoji($patungan->category);

        return trim($emoji.' '.$patungan->title);
    }

    /** The title alone, for mid-sentence use. */
    private function shortTitle(Patungan $patungan): string
    {
        return $patungan->title;
    }

    /**
     * Equal splits get a per-person figure; anything else points at the link,
     * because there is no single number that would be true for everyone.
     */
    private function perPerson(Patungan $patungan): string
    {
        if ($patungan->split_type === SplitType::Equal && filled($patungan->equal_amount)) {
            return 'Patungan '.Money::format((int) $patungan->equal_amount).'/orang.';
        }

        return 'Nominal tiap orang beda-beda, cek di link ya.';
    }

    private function emoji(?PatunganCategory $category): string
    {
        return match ($category) {
            PatunganCategory::Olahraga => '🏸',
            PatunganCategory::Makan => '🍜',
            PatunganCategory::Nongkrong => '☕',
            PatunganCategory::Trip => '✈️',
            PatunganCategory::Villa => '🏡',
            PatunganCategory::Kado => '🎁',
            PatunganCategory::Acara => '🎉',
            PatunganCategory::Kas => '🧾',
            default => '💸',
        };
    }

    /** @param list<string> $lines */
    private function lines(array $lines): string
    {
        return implode("\n", $lines);
    }
}
