import { CategoryIcon } from '@/components/patungan/category-icon';
import { MoneyText } from '@/components/patungan/money-text';
import { ProgressBar } from '@/components/patungan/progress-bar';
import { StatusBadge } from '@/components/patungan/status-badge';
import type { PatunganCard as PatunganCardData } from '@/types';
import { Link } from '@inertiajs/react';
import { ChevronRight } from 'lucide-react';

export function PatunganCard({ patungan }: { patungan: PatunganCardData }) {
    return (
        <Link
            href={route('patungan.show', patungan.uuid)}
            className="group border-border bg-card hover:border-primary/40 focus-visible:ring-ring block rounded-2xl border p-4 transition hover:shadow-sm focus-visible:ring-2 focus-visible:outline-none"
        >
            <div className="flex items-start gap-3">
                <CategoryIcon category={patungan.category} />

                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className="text-foreground truncate font-semibold">{patungan.title}</h3>
                        <StatusBadge status={patungan.status} label={patungan.status_label} />
                    </div>

                    <p className="text-muted-foreground mt-0.5 text-sm">
                        {patungan.paid_participant_count} dari {patungan.participant_count} sudah bayar
                    </p>
                </div>

                <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0 transition group-hover:translate-x-0.5" />
            </div>

            <div className="mt-4">
                <ProgressBar
                    value={patungan.collected_amount}
                    total={patungan.target_amount}
                    tone={patungan.status === 'COMPLETED' ? 'success' : 'brand'}
                />
                <div className="mt-2 flex items-baseline justify-between text-sm">
                    <MoneyText amount={patungan.collected_amount} className="text-foreground" />
                    <span className="text-muted-foreground">dari {new Intl.NumberFormat('id-ID').format(patungan.target_amount)}</span>
                </div>
            </div>
        </Link>
    );
}
