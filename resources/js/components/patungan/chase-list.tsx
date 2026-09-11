import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, CircleCheck, Megaphone, Send } from 'lucide-react';

export interface ChaseRow {
    uuid: string;
    title: string;
    percent: number;
    collected: number;
    target: number;
    outstanding: number;
}

const rowTones = [
    {
        shell: 'border-emerald-200/80 bg-emerald-50/85 dark:border-emerald-300/15 dark:bg-emerald-400/10',
        badge: 'bg-emerald-700',
        bar: 'from-emerald-700 to-emerald-400',
    },
    {
        shell: 'border-teal-200/80 bg-teal-50/80 dark:border-teal-300/15 dark:bg-teal-400/10',
        badge: 'bg-teal-600',
        bar: 'from-teal-600 to-emerald-400',
    },
    {
        shell: 'border-green-200/80 bg-green-50/80 dark:border-green-300/15 dark:bg-green-400/10',
        badge: 'bg-green-600',
        bar: 'from-green-600 to-lime-400',
    },
    {
        shell: 'border-lime-200/80 bg-lime-50/90 dark:border-lime-300/15 dark:bg-lime-400/10',
        badge: 'bg-lime-500 text-emerald-950',
        bar: 'from-emerald-500 to-lime-400',
    },
] as const;

/** The outstanding patungan queue, ranked by the money still missing. */
export function ChaseList({ rows, className }: { rows: ChaseRow[]; className?: string }) {
    return (
        <section
            className={cn(
                'dashboard-card from-card via-card relative flex flex-col overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br to-emerald-50/75 p-5 lg:p-6 dark:border-emerald-400/15 dark:to-emerald-400/10',
                className,
            )}
        >
            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <p className="text-primary text-[10px] font-extrabold tracking-[0.16em] uppercase">Perlu diingatkan</p>
                    <h2 className="display mt-1 text-lg sm:text-xl">Yang perlu disapa dulu</h2>
                    <p className="text-muted-foreground mt-1 text-[11px]">Urut dari sisa tagihan terbesar.</p>
                </div>
                <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-2xl">
                    <Megaphone className="size-4.5" strokeWidth={2.3} />
                </span>
            </div>

            {rows.length === 0 ? (
                <div className="relative my-auto py-8 text-center">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                        <CircleCheck className="size-5" strokeWidth={2.4} />
                    </span>
                    <p className="mt-3 text-sm font-extrabold tracking-tight">Semua aman!</p>
                    <p className="text-muted-foreground mt-1 text-xs">Belum ada tagihan yang perlu diingatkan.</p>
                </div>
            ) : (
                <ul className="relative mt-4 space-y-2.5">
                    {rows.map((row, index) => {
                        const tone = rowTones[index % rowTones.length];
                        const percent = Math.min(Math.max(row.percent, 0), 100);

                        return (
                            <li key={row.uuid}>
                                <Link
                                    href={route('patungan.show', row.uuid)}
                                    className={cn('group block rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md', tone.shell)}
                                >
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={cn(
                                                'flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white shadow-sm',
                                                tone.badge,
                                            )}
                                        >
                                            {index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="truncate text-xs font-extrabold tracking-tight">{row.title}</span>
                                                <span className="shrink-0 text-xs font-extrabold text-orange-600 tabular-nums dark:text-orange-300">
                                                    {rupiah(row.outstanding)}
                                                </span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/80 dark:bg-white/10">
                                                    <div
                                                        className={cn(
                                                            'h-full rounded-full bg-gradient-to-r transition-[width] duration-500',
                                                            tone.bar,
                                                        )}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                                <span className="w-8 text-right text-[9px] font-bold tabular-nums">
                                                    {percent.toLocaleString('id-ID')}%
                                                </span>
                                            </div>
                                        </div>
                                        <Send className="text-muted-foreground size-3.5 shrink-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            <Link
                href={route('patungan.index')}
                className="text-primary group relative mt-auto inline-flex items-center gap-1 pt-4 text-xs font-bold"
            >
                Lihat semua patungan
                <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
        </section>
    );
}
