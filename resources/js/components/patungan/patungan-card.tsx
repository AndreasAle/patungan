import { CategoryIcon } from '@/components/patungan/category-icon';
import { ProgressBar } from '@/components/patungan/progress-bar';
import { StatusBadge } from '@/components/patungan/status-badge';
import { percentage, rupiah, timeLeft } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PatunganCard as PatunganCardData } from '@/types';
import { Link } from '@inertiajs/react';
import { CalendarClock } from 'lucide-react';

/**
 * One patungan at a glance.
 *
 * The money is the loudest thing on the card, everything else is quiet
 * supporting detail - the same order of importance the landing page uses.
 */
export function PatunganCard({ patungan }: { patungan: PatunganCardData }) {
    const percent = percentage(patungan.collected_amount, patungan.target_amount);
    const remaining = patungan.has_expired ? null : timeLeft(patungan.expires_at, Date.now());
    const done = patungan.status === 'COMPLETED';

    return (
        <Link
            href={route('patungan.show', patungan.uuid)}
            className="group border-border bg-card hover:border-primary/30 focus-visible:ring-ring block rounded-3xl border p-4 transition hover:shadow-[0_2px_20px_rgba(16,66,44,0.07)] focus-visible:ring-2 focus-visible:outline-none sm:p-5"
        >
            <div className="flex items-start gap-3">
                <CategoryIcon category={patungan.category} size="md" />

                <div className="min-w-0 flex-1">
                    {/* The head count lives on the bottom row, so this stays one short line. */}
                    <p className="text-muted-foreground truncate text-[10px] font-semibold tracking-[0.14em] uppercase">{patungan.category_label}</p>
                    <h3 className="text-foreground mt-1 line-clamp-2 text-[15px] leading-snug font-bold tracking-tight sm:text-base">
                        {patungan.title}
                    </h3>
                </div>

                <StatusBadge className="shrink-0" status={patungan.status} label={patungan.status_label} />
            </div>

            <div className="mt-5 flex items-end justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">Terkumpul</p>
                    <p className="display text-foreground mt-1.5 truncate text-xl tabular-nums sm:text-2xl">{rupiah(patungan.collected_amount)}</p>
                </div>

                <p className="text-muted-foreground shrink-0 pb-0.5 text-xs">dari {rupiah(patungan.target_amount)}</p>
            </div>

            <ProgressBar className="mt-3" value={patungan.collected_amount} total={patungan.target_amount} tone={done ? 'success' : 'lime'} />

            <div className="mt-2.5 flex items-center justify-between gap-3 text-[11px]">
                <span className="text-muted-foreground">
                    <span className="text-foreground font-bold tabular-nums">
                        {patungan.paid_participant_count}/{patungan.participant_count}
                    </span>{' '}
                    sudah bayar
                </span>

                {patungan.has_expired ? (
                    <span className="chip bg-muted text-muted-foreground">
                        <CalendarClock className="size-3" />
                        Lewat batas waktu
                    </span>
                ) : remaining ? (
                    <span className="chip bg-warning-soft text-warning">
                        <CalendarClock className="size-3" />
                        {remaining}
                    </span>
                ) : (
                    <span className={cn('font-bold tabular-nums', done ? 'text-success' : 'text-muted-foreground')}>{percent}%</span>
                )}
            </div>
        </Link>
    );
}
