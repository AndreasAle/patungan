import { CategoryIcon } from '@/components/patungan/category-icon';
import { ProgressBar } from '@/components/patungan/progress-bar';
import { StatusBadge } from '@/components/patungan/status-badge';
import { rupiah } from '@/lib/format';
import type { PatunganCard as PatunganCardData } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

export function PatunganCard({ patungan }: { patungan: PatunganCardData }) {
    return (
        <Link
            href={route('patungan.show', patungan.uuid)}
            className="group border-border bg-card hover:border-primary/30 focus-visible:ring-ring block rounded-2xl border p-3.5 transition hover:shadow-[0_1px_12px_rgba(16,66,44,0.06)] focus-visible:ring-2 focus-visible:outline-none"
        >
            <div className="flex items-center gap-3">
                <CategoryIcon category={patungan.category} size="sm" />

                <div className="min-w-0 flex-1">
                    <h3 className="text-foreground truncate text-sm font-semibold">{patungan.title}</h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                        {patungan.paid_participant_count} dari {patungan.participant_count} sudah bayar
                    </p>
                </div>

                <StatusBadge status={patungan.status} label={patungan.status_label} />
                <ChevronRight className="text-muted-foreground size-4 shrink-0 transition group-hover:translate-x-0.5" />
            </div>

            <div className="mt-3">
                <ProgressBar
                    value={patungan.collected_amount}
                    total={patungan.target_amount}
                    tone={patungan.status === 'COMPLETED' ? 'success' : 'lime'}
                />
                <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-foreground text-sm font-semibold tabular-nums">{rupiah(patungan.collected_amount)}</span>
                    <span className="text-muted-foreground text-xs">dari {rupiah(patungan.target_amount)}</span>
                </div>
            </div>
        </Link>
    );
}
