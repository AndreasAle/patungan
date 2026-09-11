import { MoneyText } from '@/components/patungan/money-text';
import { Pagination } from '@/components/patungan/pagination';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowDownLeft, ArrowUpRight, Plus, ReceiptText, WalletCards } from 'lucide-react';

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

interface TransactionSummary {
    balance: number;
    incoming: number;
    outgoing: number;
}

export default function Transaksi({ entries, summary }: { entries: Paginated<LedgerEntry>; summary: TransactionSummary }) {
    return (
        <PatunganLayout title="Transaksi">
            <Head title="Transaksi" />

            <section className="surface-deep relative overflow-hidden rounded-[1.75rem] px-5 py-5 sm:px-6 sm:py-6">
                <span aria-hidden="true" className="absolute -top-12 -right-10 size-40 rounded-full border-[26px] border-white/5" />
                <span aria-hidden="true" className="bg-lime/15 absolute top-8 right-14 size-12 rounded-full" />

                <div className="relative flex items-start justify-between gap-4">
                    <div>
                        <p className="text-brand-deep-muted flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase">
                            <WalletCards className="size-3.5" />
                            Saldo transaksi
                        </p>
                        <p className="display text-brand-deep-foreground mt-2 text-[30px] tabular-nums sm:text-4xl">{rupiah(summary.balance)}</p>
                        <p className="text-brand-deep-muted mt-1 text-[10px]">Saldo setelah seluruh dana masuk dan keluar</p>
                    </div>

                    <span className="bg-lime text-lime-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
                        <ReceiptText className="size-5" strokeWidth={2.2} />
                    </span>
                </div>

                <div className="relative mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/15">
                    <div className="bg-white/8 px-3.5 py-3">
                        <p className="text-brand-deep-muted flex items-center gap-1.5 text-[9px] font-bold tracking-[0.1em] uppercase">
                            <ArrowDownLeft className="size-3" /> Masuk
                        </p>
                        <p className="text-brand-deep-foreground mt-1.5 truncate text-sm font-bold tabular-nums">{rupiah(summary.incoming)}</p>
                    </div>
                    <div className="bg-white/8 px-3.5 py-3">
                        <p className="text-brand-deep-muted flex items-center gap-1.5 text-[9px] font-bold tracking-[0.1em] uppercase">
                            <ArrowUpRight className="size-3" /> Keluar
                        </p>
                        <p className="text-brand-deep-foreground mt-1.5 truncate text-sm font-bold tabular-nums">{rupiah(summary.outgoing)}</p>
                    </div>
                </div>
            </section>

            <div className="mt-6 flex items-end justify-between gap-4 px-1">
                <div>
                    <p className="text-primary text-[10px] font-extrabold tracking-[0.15em] uppercase">Aktivitas dana</p>
                    <h1 className="display mt-1 text-xl sm:text-2xl">Riwayat transaksi</h1>
                </div>
                <span className="bg-brand-soft text-primary rounded-full px-3 py-1.5 text-[10px] font-bold tabular-nums">
                    {entries.total} catatan
                </span>
            </div>

            {entries.data.length === 0 ? (
                <section className="dark:via-card mt-4 overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-5 text-center dark:border-emerald-400/15 dark:from-emerald-400/10 dark:to-lime-400/10">
                    <div className="relative mx-auto flex h-28 w-36 items-center justify-center">
                        <span className="bg-lime/35 absolute left-2 size-14 rounded-full" />
                        <span className="bg-primary/10 absolute right-1 bottom-1 size-16 rounded-full" />
                        <span className="bg-card text-primary relative flex size-16 items-center justify-center rounded-[1.35rem] border border-emerald-100 shadow-[0_12px_30px_rgba(13,78,55,0.12)] dark:border-emerald-300/10">
                            <ReceiptText className="size-7" strokeWidth={1.9} />
                        </span>
                    </div>
                    <h2 className="display mt-2 text-lg">Belum ada pergerakan dana</h2>
                    <p className="text-muted-foreground mx-auto mt-2 max-w-xs text-xs leading-relaxed">
                        Begitu peserta membayar atau kamu mencairkan saldo, catatannya otomatis muncul di sini.
                    </p>
                    <Button asChild className="mt-5 h-11 rounded-full px-6 text-xs font-bold">
                        <Link href={route('patungan.create')}>
                            <Plus className="size-4" />
                            Buat Patungan
                        </Link>
                    </Button>
                </section>
            ) : (
                <>
                    <ul className="mt-4 space-y-2.5">
                        {entries.data.map((entry) => {
                            const credit = entry.direction === 'CREDIT';

                            return (
                                <li
                                    key={entry.uuid}
                                    className="dashboard-card border-border bg-card flex items-center gap-3 rounded-2xl border px-3.5 py-3.5 sm:px-4"
                                >
                                    <span
                                        className={cn(
                                            'flex size-10 shrink-0 items-center justify-center rounded-2xl',
                                            credit
                                                ? 'bg-brand-soft text-primary'
                                                : 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
                                        )}
                                    >
                                        {credit ? <ArrowDownLeft className="size-[18px]" /> : <ArrowUpRight className="size-[18px]" />}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-sm font-extrabold tracking-tight">{entry.type_label}</p>
                                            <span className={cn('size-1.5 shrink-0 rounded-full', credit ? 'bg-lime' : 'bg-amber-400')} />
                                        </div>
                                        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                                            {entry.description}
                                            {entry.patungan_title && ` · ${entry.patungan_title}`}
                                        </p>
                                        <p className="text-muted-foreground/70 mt-1 text-[9px]">{formatDateTime(entry.created_at)}</p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                        <div
                                            className={cn(
                                                'flex items-baseline justify-end text-sm font-extrabold',
                                                credit ? 'text-primary' : 'text-foreground',
                                            )}
                                        >
                                            <span>{credit ? '+' : '−'}</span>
                                            <MoneyText amount={entry.amount} size="sm" />
                                        </div>
                                        {entry.balance_after !== null && (
                                            <p className="text-muted-foreground mt-1 text-[9px] tabular-nums">Saldo {rupiah(entry.balance_after)}</p>
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
