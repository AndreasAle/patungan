import { EmptyState } from '@/components/patungan/empty-state';
import { MoneyText } from '@/components/patungan/money-text';
import { Pagination } from '@/components/patungan/pagination';
import { PageHeader } from '@/components/patungan/section-heading';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import { Head } from '@inertiajs/react';
import { ArrowDownLeft, ArrowUpRight, Receipt } from 'lucide-react';

interface LedgerEntry {
    uuid: string;
    type: string;
    type_label: string;
    direction: 'CREDIT' | 'DEBIT';
    amount: number;
    balance_after: number | null;
    description: string;
    patungan_title: string | null;
    created_at: string | null;
}

export default function Transaksi({ entries }: { entries: Paginated<LedgerEntry> }) {
    return (
        <PatunganLayout title="Transaksi">
            <Head title="Transaksi" />

            <PageHeader eyebrow="Buku besar" title="Transaksi" description="Setiap rupiah yang masuk dan keluar, lengkap dengan sisa saldonya." />

            {entries.data.length === 0 ? (
                <EmptyState className="mt-6" icon={Receipt} title="Belum ada transaksi." description="Transaksi muncul setelah ada yang bayar." />
            ) : (
                <>
                    <ul className="border-border bg-card divide-border mt-6 divide-y overflow-hidden rounded-3xl border">
                        {entries.data.map((entry) => {
                            const credit = entry.direction === 'CREDIT';

                            return (
                                <li key={entry.uuid} className="hover:bg-surface/60 flex items-center gap-3 px-4 py-3.5 transition sm:px-5">
                                    <span
                                        className={cn(
                                            'flex size-9 shrink-0 items-center justify-center rounded-xl',
                                            credit ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {credit ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold tracking-tight">{entry.type_label}</p>
                                        <p className="text-muted-foreground truncate text-xs">
                                            {entry.description}
                                            {entry.patungan_title && ` · ${entry.patungan_title}`}
                                        </p>
                                        <p className="text-muted-foreground/70 mt-0.5 text-[10px]">{formatDateTime(entry.created_at)}</p>
                                    </div>

                                    <div className="text-right">
                                        <MoneyText amount={entry.amount} size="sm" className={cn(credit ? 'text-success' : 'text-foreground')} />
                                        {entry.balance_after !== null && (
                                            <p className="text-muted-foreground text-[10px]">saldo {entry.balance_after.toLocaleString('id-ID')}</p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <Pagination className="mt-6" current={entries.current_page} last={entries.last_page} routeName="transactions.index" />
                </>
            )}
        </PatunganLayout>
    );
}
