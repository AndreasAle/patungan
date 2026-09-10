import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';

export interface Collection {
    percent: number;
    collected: number;
    due: number;
    unpaid_people: number;
    unpaid_amount: number;
}

const RADIUS = 78;
const STROKE = 18;

/**
 * A half-circle gauge of how much of the money owed has actually arrived.
 *
 * Measured in rupiah rather than in people. Ten payers who owe Rp10.000 each
 * and one who owes Rp1.000.000 are not eleven equal problems, and a gauge
 * counting heads would sit near full while the only payment that mattered was
 * still missing.
 */
export function CollectionGauge({ collection, className }: { collection: Collection; className?: string }) {
    const percent = Math.min(Math.max(collection.percent, 0), 100);

    // A semicircle: half the circumference is the whole track.
    const half = Math.PI * RADIUS;
    const filled = (percent / 100) * half;

    return (
        <section className={cn('border-border bg-card flex flex-col rounded-3xl border p-5 lg:p-6', className)}>
            <p className="text-muted-foreground text-[11px] font-bold tracking-[0.14em] uppercase">Tingkat pelunasan</p>

            <div className="relative mx-auto mt-4 w-full max-w-[240px]">
                <svg viewBox="0 0 200 112" className="w-full" role="img" aria-label={`${percent} persen dari tagihan sudah terkumpul`}>
                    <path
                        d={`M ${100 - RADIUS} 100 A ${RADIUS} ${RADIUS} 0 0 1 ${100 + RADIUS} 100`}
                        fill="none"
                        stroke="var(--color-muted)"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                    />
                    <path
                        d={`M ${100 - RADIUS} 100 A ${RADIUS} ${RADIUS} 0 0 1 ${100 + RADIUS} 100`}
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        strokeDasharray={`${filled} ${half}`}
                        className="transition-[stroke-dasharray] duration-700"
                    />
                </svg>

                <div className="absolute inset-x-0 bottom-0 text-center">
                    <p className="display text-foreground text-3xl tabular-nums">
                        {percent.toLocaleString('id-ID')}
                        <span className="text-muted-foreground text-lg font-semibold">%</span>
                    </p>
                </div>
            </div>

            <p className="text-muted-foreground mt-3 text-center text-[11px] leading-relaxed">
                {rupiah(collection.collected)} dari {rupiah(collection.due)} yang ditagihkan
            </p>

            <div className="border-border mt-auto border-t pt-4">
                {collection.unpaid_people === 0 ? (
                    <p className="text-success text-xs font-semibold">Semua peserta sudah bayar.</p>
                ) : (
                    <>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="text-muted-foreground text-xs">Belum bayar</span>
                            <span className="text-sm font-bold tabular-nums">{collection.unpaid_people} orang</span>
                        </div>
                        <div className="mt-1.5 flex items-baseline justify-between gap-3">
                            <span className="text-muted-foreground text-xs">Nilainya</span>
                            <span className="text-warning text-sm font-bold tabular-nums">{rupiah(collection.unpaid_amount)}</span>
                        </div>
                    </>
                )}

                <Link href={route('patungan.index')} className="text-primary group mt-3 inline-flex items-center gap-1 text-xs font-semibold">
                    Lihat patungan
                    <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
            </div>
        </section>
    );
}
