import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, CircleCheck } from 'lucide-react';

export interface ChaseRow {
    uuid: string;
    title: string;
    percent: number;
    collected: number;
    target: number;
    outstanding: number;
}

/**
 * Which patungan still owe the most money, worst first.
 *
 * Ordered by the rupiah still missing rather than by percentage, because the
 * question this card answers is "who do I chase today". A patungan sitting at
 * 90% of Rp5.000.000 needs the call before one at 10% of Rp50.000.
 */
export function ChaseList({ rows, className }: { rows: ChaseRow[]; className?: string }) {
    return (
        <section className={cn('border-border bg-card flex flex-col rounded-3xl border p-5 lg:p-6', className)}>
            <div>
                <p className="text-muted-foreground text-[11px] font-bold tracking-[0.14em] uppercase">Perlu ditagih</p>
                <h2 className="display mt-2 text-lg sm:text-xl">Sisa tagihan terbesar</h2>
            </div>

            {rows.length === 0 ? (
                <div className="my-auto py-8 text-center">
                    <span className="bg-success-soft text-success mx-auto flex size-11 items-center justify-center rounded-2xl">
                        <CircleCheck className="size-5" strokeWidth={2.4} />
                    </span>
                    <p className="mt-3 text-sm font-bold tracking-tight">Tidak ada sisa tagihan</p>
                    <p className="text-muted-foreground mt-1 text-xs">Semua patungan yang jalan sudah lunas.</p>
                </div>
            ) : (
                <ul className="mt-4 space-y-3.5">
                    {rows.map((row) => (
                        <li key={row.uuid}>
                            <Link href={route('patungan.show', row.uuid)} className="group block">
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="group-hover:text-primary truncate text-sm font-bold tracking-tight transition">{row.title}</span>
                                    <span className="text-warning shrink-0 text-xs font-bold tabular-nums">-{rupiah(row.outstanding)}</span>
                                </div>

                                <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                                    <div
                                        className="bg-primary h-full rounded-full transition-[width] duration-500"
                                        style={{ width: `${row.percent}%` }}
                                    />
                                </div>

                                <p className="text-muted-foreground mt-1 text-[11px] tabular-nums">
                                    {row.percent.toLocaleString('id-ID')}% terkumpul · {rupiah(row.collected)} dari {rupiah(row.target)}
                                </p>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <Link href={route('patungan.index')} className="text-primary group mt-auto inline-flex items-center gap-1 pt-4 text-xs font-semibold">
                Semua patungan
                <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
        </section>
    );
}
