import { MoneyText } from '@/components/patungan/money-text';
import { Pagination } from '@/components/patungan/pagination';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { ArrowDownLeft, ArrowUpRight, Plus, ReceiptText, Sparkles, WalletCards } from 'lucide-react';

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

type Filter = 'all' | 'credit' | 'debit';

function dateLabel(value: string | null): string {
    if (!value) return 'Tanggal tidak diketahui';
    return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

export default function Transaksi({
    entries,
    summary,
    filter = 'all',
}: {
    entries: Paginated<LedgerEntry>;
    summary: TransactionSummary;
    filter: Filter;
}) {
    const grouped = entries.data.reduce<Record<string, LedgerEntry[]>>((result, entry) => {
        const label = dateLabel(entry.created_at);
        result[label] = [...(result[label] ?? []), entry];
        return result;
    }, {});

    return (
        <PatunganLayout title="Transaksi">
            <Head title="Transaksi" />

            <section className="surface-deep relative overflow-hidden rounded-[1.75rem] px-5 py-5 sm:px-6">
                <span aria-hidden="true" className="absolute -top-16 -right-10 size-40 rounded-full border-[24px] border-white/5" />
                <span aria-hidden="true" className="bg-lime/15 absolute top-7 right-16 size-12 rounded-full" />

                <div className="relative grid items-center gap-5 sm:grid-cols-[1fr_auto]">
                    <div>
                        <p className="text-brand-deep-muted flex items-center gap-2 text-[10px] font-bold tracking-[0.14em] uppercase">
                            <WalletCards className="size-3.5" /> Saldo saat ini
                        </p>
                        <p className="display text-brand-deep-foreground mt-2 text-[30px] tabular-nums sm:text-4xl">{rupiah(summary.balance)}</p>
                    </div>

                    <dl className="grid grid-cols-2 gap-2 sm:min-w-80">
                        {[
                            { label: 'Masuk', amount: summary.incoming, icon: ArrowDownLeft, tone: 'text-lime-300' },
                            { label: 'Keluar', amount: summary.outgoing, icon: ArrowUpRight, tone: 'text-amber-200' },
                        ].map((item) => (
                            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 px-3.5 py-3 backdrop-blur-sm">
                                <dt className={cn('flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase', item.tone)}>
                                    <item.icon className="size-3" /> {item.label}
                                </dt>
                                <dd className="text-brand-deep-foreground mt-1.5 text-sm font-extrabold tabular-nums">{rupiah(item.amount)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </section>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-3 px-1">
                <div>
                    <p className="text-primary flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.15em] uppercase">
                        <Sparkles className="size-3" /> Aktivitas dana
                    </p>
                    <h1 className="display mt-1 text-xl sm:text-2xl">Riwayat transaksi</h1>
                </div>
                <span className="bg-brand-soft text-primary rounded-full px-3 py-1.5 text-[10px] font-bold tabular-nums">
                    {entries.total} catatan
                </span>
            </div>

            <nav className="mt-4 flex gap-2" aria-label="Filter transaksi">
                {[
                    { key: 'all' as const, label: 'Semua' },
                    { key: 'credit' as const, label: 'Masuk' },
                    { key: 'debit' as const, label: 'Keluar' },
                ].map((item) => (
                    <Link
                        key={item.key}
                        href={route('transactions.index', item.key === 'all' ? {} : { direction: item.key })}
                        preserveScroll
                        className={cn(
                            'rounded-full px-4 py-2 text-xs font-bold transition',
                            filter === item.key
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary border',
                        )}
                    >
                        {item.label}
                    </Link>
                ))}
            </nav>

            {entries.data.length === 0 ? (
                <section className="dark:via-card mt-4 overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 p-6 text-center dark:border-emerald-400/15 dark:from-emerald-400/10 dark:to-lime-400/10">
                    <span className="bg-card text-primary mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-100 shadow-sm dark:border-emerald-300/10">
                        <ReceiptText className="size-6" />
                    </span>
                    <h2 className="display mt-4 text-lg">Belum ada transaksi</h2>
                    <p className="text-muted-foreground mt-1.5 text-xs">Aktivitas dana kamu akan muncul di sini.</p>
                    {filter === 'all' && (
                        <Button asChild className="mt-5 h-11 rounded-full px-6 text-xs font-bold">
                            <Link href={route('patungan.create')}>
                                <Plus className="size-4" /> Buat Patungan
                            </Link>
                        </Button>
                    )}
                </section>
            ) : (
                <div className="border-border bg-card mt-4 overflow-hidden rounded-[1.5rem] border shadow-[0_18px_50px_-42px_rgba(5,74,52,.45)]">
                    {Object.entries(grouped).map(([date, items]) => (
                        <section key={date}>
                            <h2 className="bg-surface text-muted-foreground border-border border-y px-4 py-2 text-[10px] font-bold tracking-[0.12em] uppercase first:border-t-0 sm:px-5">
                                {date}
                            </h2>
                            <ul className="divide-border divide-y">
                                {items.map((entry) => {
                                    const credit = entry.direction === 'CREDIT';
                                    return (
                                        <li
                                            key={entry.uuid}
                                            className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-emerald-50/35 sm:px-5 dark:hover:bg-emerald-400/5"
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
                                                <p className="truncate text-sm font-extrabold tracking-tight">{entry.type_label}</p>
                                                <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                                                    {entry.patungan_title ?? entry.description}
                                                </p>
                                                <p className="text-muted-foreground/70 mt-1 text-[10px]">{formatDateTime(entry.created_at)}</p>
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
                                                    <p className="text-muted-foreground mt-1 text-[10px] tabular-nums">
                                                        Saldo {rupiah(entry.balance_after)}
                                                    </p>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </section>
                    ))}
                </div>
            )}

            <Pagination
                className="mt-6"
                current={entries.current_page}
                last={entries.last_page}
                routeName="transactions.index"
                params={{ direction: filter === 'all' ? undefined : filter }}
            />
        </PatunganLayout>
    );
}
