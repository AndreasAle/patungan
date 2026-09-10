<?php

namespace App\Support;

use App\Enums\LedgerType;
use App\Enums\ParticipantStatus;
use App\Enums\PatunganStatus;
use App\Models\Patungan;
use App\Models\PatunganParticipant;
use App\Models\User;
use App\Models\WalletLedger;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * The figures behind the dashboard's headline cards.
 *
 * Every number here is counted from the ledger or from participant rows. None
 * of them is a projection, an estimate, or a ratio invented to fill a chart:
 * an organizer reading this page is deciding whether to chase somebody for
 * money, and a decorative metric would be worse than an empty card.
 */
class DashboardMetrics
{
    /** Six points is enough to see a direction without implying a forecast. */
    private const MONTHS = 6;

    /**
     * Money received per month, and how this month compares with last.
     *
     * @return array{value: int, series: list<int>, labels: list<string>, delta: float|null, previous: int}
     */
    public function collected(User $user): array
    {
        $series = $this->monthly(
            WalletLedger::query()
                ->where('user_id', $user->id)
                ->where('type', LedgerType::PaymentReceived->value),
            'created_at',
            'SUM(amount)',
        );

        return $this->withDelta($series);
    }

    /**
     * Participants who settled, per month.
     *
     * Counted from paid_at rather than the row's creation, so somebody who was
     * added in March and paid in May lands in May - which is the month the
     * organizer actually saw the money.
     *
     * @return array{value: int, series: list<int>, labels: list<string>, delta: float|null, previous: int}
     */
    public function settled(User $user): array
    {
        $series = $this->monthly(
            PatunganParticipant::query()
                ->whereIn('patungan_id', Patungan::query()->where('organizer_id', $user->id)->select('id'))
                ->where('status', ParticipantStatus::Paid->value)
                ->whereNotNull('paid_at'),
            'paid_at',
            'COUNT(*)',
        );

        return $this->withDelta($series);
    }

    /**
     * Patungan created per month.
     *
     * @return array{value: int, series: list<int>, labels: list<string>, delta: float|null, previous: int}
     */
    public function created(User $user): array
    {
        $series = $this->monthly(
            Patungan::query()->where('organizer_id', $user->id),
            'created_at',
            'COUNT(*)',
        );

        return $this->withDelta($series);
    }

    /**
     * How much of what is owed on running patungan has actually come in.
     *
     * Measured in rupiah, not in headcount. Ten people who each owe Rp10.000
     * and one who owes Rp1.000.000 are not eleven equal problems, and a
     * percentage of people paid would say the collection is going well right up
     * until the only payment that mattered is the missing one.
     *
     * @return array{percent: float, collected: int, due: int, unpaid_people: int, unpaid_amount: int}
     */
    public function collection(User $user): array
    {
        $ongoing = Patungan::query()
            ->where('organizer_id', $user->id)
            ->whereIn('status', [PatunganStatus::Active->value, PatunganStatus::Draft->value])
            ->select('id');

        $rows = PatunganParticipant::query()
            ->whereIn('patungan_id', $ongoing)
            ->selectRaw('SUM(amount_due) as due, SUM(amount_paid) as paid')
            ->first();

        $due = (int) ($rows->due ?? 0);
        $paid = (int) ($rows->paid ?? 0);

        $outstanding = PatunganParticipant::query()
            ->whereIn('patungan_id', $ongoing)
            ->whereIn('status', [ParticipantStatus::Unpaid->value, ParticipantStatus::Pending->value]);

        return [
            // Capped: a participant who overpays must not push the gauge past
            // full and make an incomplete collection look finished.
            'percent' => $due > 0 ? round(min($paid / $due, 1) * 100, 1) : 0.0,
            'collected' => $paid,
            'due' => $due,
            'unpaid_people' => (clone $outstanding)->count(),
            'unpaid_amount' => (int) (clone $outstanding)->sum('amount_due'),
        ];
    }

    /**
     * The running patungan with money still outstanding, worst first.
     *
     * Sorted by what is still missing rather than by percentage: the point of
     * the list is to answer "who do I chase today", and a patungan at 90% of
     * Rp5.000.000 is a bigger problem than one at 10% of Rp50.000.
     *
     * @return list<array{uuid: string, title: string, percent: float, collected: int, target: int, outstanding: int}>
     */
    public function chase(User $user, int $limit = 5): array
    {
        return Patungan::query()
            ->where('organizer_id', $user->id)
            ->whereIn('status', [PatunganStatus::Active->value, PatunganStatus::Draft->value])
            ->get()
            ->map(function (Patungan $patungan): array {
                $target = (int) $patungan->target_amount;
                $collected = (int) $patungan->collected_amount;

                return [
                    'uuid' => $patungan->uuid,
                    'title' => $patungan->title,
                    'percent' => $target > 0 ? round(min($collected / $target, 1) * 100, 1) : 0.0,
                    'collected' => $collected,
                    'target' => $target,
                    'outstanding' => max($target - $collected, 0),
                ];
            })
            ->filter(fn (array $row): bool => $row['outstanding'] > 0)
            ->sortByDesc('outstanding')
            ->take($limit)
            ->values()
            ->all();
    }

    /**
     * Groups a query into one bucket per month, oldest first.
     *
     * Months with no rows are filled with zero rather than omitted. A series
     * that silently skips an empty month draws a flat line across a gap and
     * turns "nothing came in" into "nothing changed".
     *
     * @return Collection<string, int>
     */
    private function monthly(mixed $query, string $column, string $aggregate): Collection
    {
        $start = now()->startOfMonth()->subMonths(self::MONTHS - 1);

        $rows = $query
            ->where($column, '>=', $start)
            ->selectRaw("DATE_FORMAT({$column}, '%Y-%m') as bucket, {$aggregate} as total")
            ->groupBy('bucket')
            ->pluck('total', 'bucket');

        $filled = collect();

        for ($i = 0; $i < self::MONTHS; $i++) {
            $month = $start->copy()->addMonths($i);
            $filled->put($month->format('Y-m'), (int) ($rows[$month->format('Y-m')] ?? 0));
        }

        return $filled;
    }

    /**
     * @param  Collection<string, int>  $series
     * @return array{value: int, series: list<int>, labels: list<string>, delta: float|null, previous: int}
     */
    private function withDelta(Collection $series): array
    {
        $values = $series->values()->all();
        $current = (int) end($values);
        $previous = (int) ($values[count($values) - 2] ?? 0);

        return [
            'value' => $current,
            'series' => $values,
            'labels' => $series->keys()
                ->map(fn (string $bucket): string => Carbon::createFromFormat('Y-m', $bucket)->translatedFormat('M'))
                ->all(),
            /*
             * Null, not zero, when last month was empty. Going from nothing to
             * something is not "a 100% rise", and printing one would be the
             * kind of number that looks like analysis and means nothing.
             */
            'delta' => $previous > 0 ? round(($current - $previous) / $previous * 100, 1) : null,
            'previous' => $previous,
        ];
    }
}
