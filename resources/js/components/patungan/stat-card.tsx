import { cn } from '@/lib/utils';
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { CSSProperties } from 'react';

export interface MetricSeries {
    value: number;
    series: number[];
    labels: string[];
    delta: number | null;
    previous: number;
}

/**
 * A six-month bar sparkline.
 *
 * Bars rather than a line, because the values are monthly totals - discrete
 * buckets, not a continuous quantity that was ever "between" two months. Every
 * bar is drawn even at zero, as a hairline, so a run of empty months reads as
 * six months of nothing instead of a chart that starts late.
 */
function Sparkline({ series, labels, tone }: { series: number[]; labels: string[]; tone: 'primary' | 'warning' }) {
    const peak = Math.max(...series, 0);
    const last = series.length - 1;

    return (
        <div className="flex h-11 items-end gap-1" aria-hidden="true">
            {series.map((value, index) => {
                const height = peak > 0 ? Math.max((value / peak) * 100, 3) : 3;

                return (
                    <span
                        key={labels[index] ?? index}
                        title={`${labels[index]}: ${value}`}
                        style={{ height: `${height}%` }}
                        className={cn(
                            'w-1.5 rounded-full transition-[height] duration-500',
                            // The current month is the one being reported, so it
                            // is the only one at full strength.
                            index === last ? (tone === 'warning' ? 'bg-warning' : 'bg-primary') : 'bg-primary/25',
                        )}
                    />
                );
            })}
        </div>
    );
}

/** "+12,4% dari bulan lalu", or an honest silence when there is nothing to compare. */
function Delta({ delta }: { delta: number | null }) {
    if (delta === null || delta === 0) {
        return <p className="text-muted-foreground mt-2 text-[11px]">Belum ada pembanding bulan lalu</p>;
    }

    const up = delta > 0;
    const Icon = up ? TrendingUp : TrendingDown;

    return (
        <p className={cn('mt-2 flex items-center gap-1.5 text-[11px] font-semibold', up ? 'text-success' : 'text-destructive')}>
            <Icon className="size-3.5" strokeWidth={2.6} />
            {up ? '+' : ''}
            {delta.toLocaleString('id-ID')}% dari bulan lalu
        </p>
    );
}

interface StatCardProps {
    icon: LucideIcon;
    label: string;
    value: string;
    /** Rendered smaller and muted right after the value, e.g. a unit. */
    suffix?: string;
    metric: MetricSeries;
    tone?: 'primary' | 'warning';
    className?: string;
    /** Carries the stagger index for the entrance animation. */
    style?: CSSProperties;
}

export function StatCard({ icon: Icon, label, value, suffix, metric, tone = 'primary', className, style }: StatCardProps) {
    return (
        <section
            className={cn(
                'dashboard-card border-primary/10 from-card via-card rounded-3xl border bg-gradient-to-br to-emerald-50/55 p-5 dark:to-emerald-400/10',
                className,
            )}
            style={style}
        >
            <div className="flex items-start justify-between gap-3">
                <p className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-[0.08em] uppercase">
                    <span className="bg-brand-soft text-primary flex size-8 items-center justify-center rounded-xl">
                        <Icon className="size-3.5" strokeWidth={2.4} />
                    </span>
                    {label}
                </p>
            </div>

            <div className="mt-3 flex items-end justify-between gap-4">
                <div className="min-w-0">
                    <p className="display text-foreground truncate text-2xl tabular-nums xl:text-[26px]">
                        {value}
                        {suffix && <span className="text-muted-foreground ml-1 text-base font-semibold">{suffix}</span>}
                    </p>
                    <Delta delta={metric.delta} />
                </div>

                <Sparkline series={metric.series} labels={metric.labels} tone={tone} />
            </div>
        </section>
    );
}
