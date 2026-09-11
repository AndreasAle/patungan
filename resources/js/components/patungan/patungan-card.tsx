import { CategoryIcon } from '@/components/patungan/category-icon';
import { ProgressBar } from '@/components/patungan/progress-bar';
import { StatusBadge } from '@/components/patungan/status-badge';
import { percentage, rupiah, timeLeft } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PatunganCard as PatunganCardData } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, CalendarClock, UsersRound } from 'lucide-react';

/** A wallet-style summary of one patungan and its payment progress. */
export function PatunganCard({ patungan }: { patungan: PatunganCardData }) {
    const percent = percentage(patungan.collected_amount, patungan.target_amount);
    const remaining = patungan.has_expired ? null : timeLeft(patungan.expires_at, Date.now());
    const done = patungan.status === 'COMPLETED';

    return (
        <Link
            href={route('patungan.show', patungan.uuid)}
            className="dashboard-card group focus-visible:ring-ring bg-card block overflow-hidden rounded-[1.65rem] border border-emerald-100 p-3 transition focus-visible:ring-2 focus-visible:outline-none dark:border-emerald-400/15"
        >
            <div className="flex items-start gap-3 px-1 pt-1 pb-3">
                <CategoryIcon category={patungan.category} size="md" className="bg-emerald-50 dark:bg-emerald-400/10" />

                <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-primary truncate text-[10px] font-bold tracking-[0.13em] uppercase">{patungan.category_label}</p>
                    <h2 className="text-foreground mt-1 truncate text-[15px] leading-snug font-extrabold tracking-tight">{patungan.title}</h2>
                </div>

                <StatusBadge className="shrink-0" status={patungan.status} label={patungan.status_label} />
            </div>

            <div className={cn('relative overflow-hidden rounded-[1.35rem] px-4 py-4 text-white', done ? 'bg-emerald-700' : 'bg-brand-deep')}>
                <span aria-hidden="true" className="absolute -top-8 -right-7 size-24 rounded-full border-[18px] border-white/5" />

                <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="text-brand-deep-muted text-[9px] font-bold tracking-[0.14em] uppercase">Terkumpul</p>
                        <p className="display mt-1 truncate text-[22px] tabular-nums sm:text-2xl">{rupiah(patungan.collected_amount)}</p>
                    </div>

                    <span className="bg-lime text-lime-foreground flex size-11 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums">
                        {percent}%
                    </span>
                </div>

                <ProgressBar className="relative mt-3" value={patungan.collected_amount} total={patungan.target_amount} tone="onDeep" />

                <div className="relative mt-2 flex items-center justify-between gap-3 text-[10px]">
                    <span className="text-brand-deep-muted">Target</span>
                    <span className="font-bold tabular-nums">{rupiah(patungan.target_amount)}</span>
                </div>
            </div>

            <div className="flex items-center gap-2 px-1 pt-3 pb-1">
                <span className="bg-brand-soft text-primary flex size-8 shrink-0 items-center justify-center rounded-xl">
                    <UsersRound className="size-3.5" strokeWidth={2.3} />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold tabular-nums">
                        {patungan.paid_participant_count}/{patungan.participant_count} sudah bayar
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-[9px]">Pembayaran peserta</p>
                </div>

                {patungan.has_expired ? (
                    <span className="chip bg-muted text-muted-foreground max-w-[8.5rem] truncate">
                        <CalendarClock className="size-3" />
                        Lewat batas
                    </span>
                ) : remaining ? (
                    <span className="chip bg-warning-soft text-warning max-w-[8.5rem] truncate">
                        <CalendarClock className="size-3" />
                        {remaining}
                    </span>
                ) : (
                    <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                        <ArrowUpRight className="size-3.5" />
                    </span>
                )}
            </div>
        </Link>
    );
}
