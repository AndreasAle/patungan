import { EmptyState } from '@/components/patungan/empty-state';
import { MoneyText } from '@/components/patungan/money-text';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
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

            <h1 className="text-2xl font-extrabold tracking-tight">Transaksi</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Semua pergerakan dana di akun kamu.</p>

            {entries.data.length === 0 ? (
                <EmptyState className="mt-6" icon={Receipt} title="Belum ada transaksi." description="Transaksi muncul setelah ada yang bayar." />
            ) : (
                <>
                    <ul className="mt-5 space-y-2">
                        {entries.data.map((entry) => {
                            const credit = entry.direction === 'CREDIT';

                            return (
                                <li key={entry.uuid} className="border-border bg-card flex items-center gap-3 rounded-2xl border px-4 py-3">
                                    <span
                                        className={cn(
                                            'flex size-9 shrink-0 items-center justify-center rounded-xl',
                                            credit ? 'bg-success-soft text-success' : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {credit ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{entry.type_label}</p>
                                        <p className="text-muted-foreground truncate text-sm">
                                            {entry.description}
                                            {entry.patungan_title && ` · ${entry.patungan_title}`}
                                        </p>
                                        <p className="text-muted-foreground mt-0.5 text-xs">{formatDateTime(entry.created_at)}</p>
                                    </div>

                                    <div className="text-right">
                                        <MoneyText amount={entry.amount} size="sm" className={cn(credit ? 'text-success' : 'text-foreground')} />
                                        {entry.balance_after !== null && (
                                            <p className="text-muted-foreground text-xs">saldo {entry.balance_after.toLocaleString('id-ID')}</p>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    {entries.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Button
                                variant="outline"
                                disabled={entries.current_page === 1}
                                onClick={() => router.get(route('transactions.index'), { page: entries.current_page - 1 }, { preserveScroll: true })}
                            >
                                Sebelumnya
                            </Button>
                            <span className="text-muted-foreground text-sm">
                                {entries.current_page} / {entries.last_page}
                            </span>
                            <Button
                                variant="outline"
                                disabled={entries.current_page === entries.last_page}
                                onClick={() => router.get(route('transactions.index'), { page: entries.current_page + 1 }, { preserveScroll: true })}
                            >
                                Berikutnya
                            </Button>
                        </div>
                    )}
                </>
            )}
        </PatunganLayout>
    );
}
