import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { rupiah } from '@/lib/format';
import type { DashboardStats } from '@/types';
import { ChartNoAxesColumnIncreasing, ChevronDown, Clock3, TrendingUp, Wallet } from 'lucide-react';

/**
 * The three numbers an organizer acts on, tucked behind one compact row.
 *
 * They cover every patungan the organizer owns, not only the ones listed
 * below. It starts closed so the mobile home opens with actions, not accounting.
 */
export function SummaryStrip({ stats }: { stats: DashboardStats }) {
    const items = [
        { icon: TrendingUp, label: 'Masuk bulan ini', value: rupiah(stats.collected_this_month) },
        { icon: Wallet, label: 'Patungan aktif', value: `${stats.active_count}` },
        { icon: Clock3, label: 'Belum bayar', value: `${stats.awaiting_count} orang` },
    ];

    return (
        <Collapsible defaultOpen={false} className="border-border bg-card overflow-hidden rounded-3xl border shadow-[0_1px_20px_rgba(16,66,44,0.05)]">
            <CollapsibleTrigger className="group hover:bg-surface flex w-full items-center gap-3 px-4 py-3.5 text-left transition">
                <span className="bg-brand-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <ChartNoAxesColumnIncreasing className="size-[17px]" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="text-foreground block text-xs font-bold tracking-tight">Ringkasan patungan</span>
                    <span className="text-muted-foreground mt-0.5 block text-[10px]">Masuk, aktif, dan yang belum bayar</span>
                </span>
                <span className="text-primary text-[10px] font-semibold group-data-[state=open]:hidden">Buka</span>
                <span className="text-primary hidden text-[10px] font-semibold group-data-[state=open]:inline">Tutup</span>
                <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>

            <CollapsibleContent>
                <dl className="divide-border border-border divide-y border-t">
                    {items.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-3 px-4 py-3">
                            <dt className="text-muted-foreground flex items-center gap-2 text-[10px] font-semibold tracking-[0.09em] uppercase">
                                <item.icon className="text-primary size-3.5" strokeWidth={2.4} />
                                {item.label}
                            </dt>
                            <dd className="text-foreground text-sm font-bold tabular-nums">{item.value}</dd>
                        </div>
                    ))}
                </dl>
            </CollapsibleContent>
        </Collapsible>
    );
}
