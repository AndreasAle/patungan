<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Contracts\Database\Query\Builder;
use Illuminate\Http\Request;

/**
 * The time dimension the admin dashboard never had.
 *
 * Every figure there was a lifetime total, and a number that only ever grows
 * reads the same whether the platform had its best week or stopped taking money
 * on Tuesday. A window turns those into something that can fall.
 *
 * The distinction this class exists to keep straight is between a *flow* and a
 * *stock*. GMV, revenue and new signups are flows: they happen during a period
 * and it is meaningful to ask how much happened last week. Held balance and
 * queued payouts are stocks: they are a level right now, and "saldo tertahan
 * dalam 7 hari terakhir" is not a quantity that exists. Only flows get a window
 * applied; stocks are read as of this moment and labelled as such.
 */
final readonly class AdminWindow
{
    /** @var array<string, array{label: string, days: int|null}> */
    public const OPTIONS = [
        '24h' => ['label' => '24 jam', 'days' => 1],
        '7d' => ['label' => '7 hari', 'days' => 7],
        '30d' => ['label' => '30 hari', 'days' => 30],
        '90d' => ['label' => '90 hari', 'days' => 90],
        'all' => ['label' => 'Sejak awal', 'days' => null],
    ];

    private const FALLBACK = '30d';

    private function __construct(
        public string $key,
        /** Null only for the lifetime window, where there is nothing to cut off. */
        public ?CarbonImmutable $start,
        public ?CarbonImmutable $previousStart,
    ) {}

    public static function fromRequest(Request $request): self
    {
        return self::make($request->string('range')->toString());
    }

    public static function make(string $key): self
    {
        // An unrecognised range falls back rather than erroring: a stale
        // bookmark should show a dashboard, not a 500.
        $key = array_key_exists($key, self::OPTIONS) ? $key : self::FALLBACK;
        $days = self::OPTIONS[$key]['days'];

        if ($days === null) {
            return new self($key, null, null);
        }

        $start = CarbonImmutable::now()->subDays($days);

        // The equivalent stretch immediately before, so "dibanding periode
        // sebelumnya" compares like with like.
        return new self($key, $start, $start->subDays($days));
    }

    public function isLifetime(): bool
    {
        return $this->start === null;
    }

    public function label(): string
    {
        return self::OPTIONS[$this->key]['label'];
    }

    /** Restricts a query to this window. A lifetime window restricts nothing. */
    public function scope(Builder $query, string $column = 'created_at'): Builder
    {
        return $this->start === null ? $query : $query->where($column, '>=', $this->start);
    }

    /** The preceding stretch of equal length, used only for the comparison figure. */
    public function scopePrevious(Builder $query, string $column = 'created_at'): Builder
    {
        if ($this->previousStart === null) {
            return $query;
        }

        return $query->where($column, '>=', $this->previousStart)->where($column, '<', $this->start);
    }

    /**
     * Percentage change against the previous period.
     *
     * Returns null rather than a number whenever the comparison would be
     * meaningless - a lifetime window has no "before", and growth from zero is
     * not a percentage. Showing "+100%" for the first payment ever taken would
     * be a lie dressed as a metric.
     */
    public function delta(int|float $current, int|float $previous): ?float
    {
        if ($this->isLifetime() || $previous <= 0) {
            return null;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    /** @return list<array{value: string, label: string}> */
    public static function choices(): array
    {
        return array_map(
            fn (string $key) => ['value' => $key, 'label' => self::OPTIONS[$key]['label']],
            array_keys(self::OPTIONS),
        );
    }
}
