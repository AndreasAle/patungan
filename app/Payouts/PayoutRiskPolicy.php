<?php

namespace App\Payouts;

use App\Enums\AccountVerificationStatus;
use App\Models\PayoutDestination;
use App\Models\Settlement;
use App\Models\User;
use Illuminate\Contracts\Config\Repository as Config;

/**
 * Decides whether a payout may leave without a human looking at it.
 *
 * The thing this exists to prevent is not a mistyped account number - the name
 * check already catches that. It is account takeover. Somebody who gets into an
 * organizer's account can add their own bank account, in their own real name,
 * and it will verify perfectly, because it genuinely is their account. If a
 * payout goes out automatically at that moment, participants' money is gone
 * with no window to notice.
 *
 * So verification alone is never enough. Every condition below has to hold, and
 * each one is here because it closes a specific way that story ends:
 *
 *   name matched       - the attacker's own account is not in the victim's name
 *   destination aged   - an instant drain becomes a drain somebody can catch
 *   phone verified     - there is a channel the attacker does not control
 *   amount under a cap - the worst case has a ceiling
 *
 * Failing any of them is not a refusal. The payout still happens; it simply
 * waits for an operator. Refusing outright would punish the organizer for our
 * caution, which is the wrong direction - the money is theirs.
 */
class PayoutRiskPolicy
{
    public function __construct(private readonly Config $config) {}

    /**
     * @return array{automatic: bool, reasons: list<string>}
     */
    public function evaluate(User $organizer, PayoutDestination $destination, int $amount): array
    {
        $reasons = [];

        if (! $this->enabled()) {
            $reasons[] = 'Pencairan otomatis belum diaktifkan.';
        }

        if ($destination->verification_status !== AccountVerificationStatus::Verified) {
            $reasons[] = 'Rekening belum terverifikasi atas nama kamu.';
        }

        if (! $this->destinationHasSettled($destination)) {
            $reasons[] = 'Rekening baru ditambahkan, menunggu '.$this->coolingHours().' jam.';
        }

        if ($organizer->phone_verified_at === null) {
            $reasons[] = 'Nomor HP belum diverifikasi.';
        }

        if ($amount > $this->ceiling()) {
            $reasons[] = 'Nominal di atas batas otomatis.';
        }

        return [
            'automatic' => $reasons === [],
            'reasons' => $reasons,
        ];
    }

    /**
     * Why a payout is waiting, in one sentence a person can act on.
     *
     * Shown to the organizer, so it says what would change the outcome rather
     * than naming a rule. "Nomor HP belum diverifikasi" is something they can
     * fix; "policy check 3 failed" is not.
     */
    public function explain(Settlement $settlement, array $reasons): string
    {
        if ($reasons === []) {
            return 'Pencairan diproses otomatis.';
        }

        return 'Dicek dulu oleh tim: '.implode(' ', $reasons);
    }

    public function enabled(): bool
    {
        return (bool) $this->config->get('patungan.payout.automatic.enabled', false);
    }

    /** The largest amount that may go out without a human. */
    public function ceiling(): int
    {
        return (int) $this->config->get('patungan.payout.automatic.max_amount', 1000000);
    }

    public function coolingHours(): int
    {
        return (int) $this->config->get('patungan.payout.automatic.cooling_hours', 24);
    }

    /**
     * Whether the destination has been on file long enough.
     *
     * Measured from when it was verified rather than created, because the
     * dangerous moment is the change itself: a destination edited five minutes
     * ago is new, however old the row is.
     */
    private function destinationHasSettled(PayoutDestination $destination): bool
    {
        $since = $destination->verified_at ?? $destination->created_at;

        if ($since === null) {
            return false;
        }

        return $since->lte(now()->subHours($this->coolingHours()));
    }
}
