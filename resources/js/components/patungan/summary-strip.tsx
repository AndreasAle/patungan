import { rupiah } from '@/lib/format';
import type { DashboardStats } from '@/types';
import { Clock3, TrendingUp, Wallet } from 'lucide-react';

/**
 * The three numbers an organizer acts on, sitting over the lower edge of the
 * green panel.
 *
 * They cover every patungan the organizer owns, not only the ones listed
 * below, so the strip does not quietly stop counting at the tenth row.
 */
export function SummaryStrip({ stats }: { stats: DashboardStats }) {
    const items = [
        { icon: TrendingUp, label: 'Masuk bulan ini', value: rupiah(stats.collected_this_month) },
        { icon: Wallet, label: 'Patungan aktif', value: `${stats.active_count}` },
        { icon: Clock3, label: 'Belum bayar', value: `${stats.awaiting_count} orang` },
    ];

    return (
        <dl className="border-border bg-card divide-border grid divide-y rounded-3xl border shadow-[0_1px_20px_rgba(16,66,44,0.05)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {items.map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-3 px-5 py-3.5 sm:block sm:px-6 sm:py-5">
                    <dt className="text-muted-foreground flex items-center gap-2 text-[11px] font-semibold tracking-[0.1em] uppercase">
                        <item.icon className="text-primary size-3.5" strokeWidth={2.4} />
                        {item.label}
                    </dt>
                    <dd className="display text-foreground text-base tabular-nums sm:mt-2.5 sm:text-2xl">{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}
