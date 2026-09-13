import { EmptyState } from '@/components/patungan/empty-state';
import { Pagination } from '@/components/patungan/pagination';
import { PatunganCard } from '@/components/patungan/patungan-card';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import { cn } from '@/lib/utils';
import type { Paginated, PatunganCard as PatunganCardData } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Layers3, Plus, Sparkles, Wallet } from 'lucide-react';

type Filter = 'all' | 'active' | 'finished';

interface PatunganIndexProps {
    patungans: Paginated<PatunganCardData>;
    filter: Filter;
    counts: Record<Filter, number>;
}

const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Semua' },
    { key: 'active', label: 'Aktif' },
    { key: 'finished', label: 'Selesai' },
];

export default function PatunganIndex({ patungans, filter, counts }: PatunganIndexProps) {
    return (
        <PatunganLayout title="Patungan">
            <Head title="Patungan" />

            <section className="border-primary/10 dark:via-card relative overflow-hidden rounded-[1.75rem] border bg-gradient-to-br from-emerald-50 via-white to-lime-50/80 px-5 py-5 sm:px-6 dark:from-emerald-400/10 dark:to-lime-400/10">
                <span aria-hidden="true" className="absolute -top-16 -right-12 size-36 rounded-full border-[22px] border-lime-300/20" />

                <div className="relative flex items-center gap-3.5">
                    <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-[0_12px_28px_-16px_rgba(4,120,87,.8)]">
                        <Layers3 className="size-5" strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-primary flex items-center gap-1.5 text-[10px] font-extrabold tracking-[0.14em] uppercase">
                            <Sparkles className="size-3" /> Koleksi kamu
                        </p>
                        <h1 className="display mt-1 text-2xl sm:text-3xl">Patungan</h1>
                    </div>
                    <div className="bg-brand-deep hidden rounded-2xl px-4 py-2.5 text-center text-white sm:block">
                        <p className="display text-xl tabular-nums">{counts.all}</p>
                        <p className="text-brand-deep-muted text-[8px] font-bold tracking-widest uppercase">Total</p>
                    </div>
                </div>

                <nav className="relative mt-5 flex gap-1.5 overflow-x-auto" aria-label="Filter patungan">
                    {filters.map((item) => (
                        <Link
                            key={item.key}
                            href={route('patungan.index', item.key === 'all' ? {} : { status: item.key })}
                            preserveScroll
                            className={cn(
                                'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-bold transition',
                                filter === item.key
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-card/75 text-muted-foreground hover:text-primary',
                            )}
                        >
                            {item.label}
                            <span
                                className={cn(
                                    'text-[9px] tabular-nums',
                                    filter === item.key ? 'text-primary-foreground/70' : 'text-muted-foreground/70',
                                )}
                            >
                                {counts[item.key]}
                            </span>
                        </Link>
                    ))}
                </nav>
            </section>

            {patungans.data.length === 0 ? (
                <EmptyState
                    className="mt-4"
                    icon={Wallet}
                    title={filter === 'all' ? 'Belum ada patungan' : `Belum ada patungan ${filter === 'active' ? 'aktif' : 'selesai'}`}
                    description={filter === 'all' ? 'Bikin satu, bagikan link, lalu pantau bareng.' : 'Coba lihat kategori lainnya.'}
                    action={
                        filter === 'all' ? (
                            <Button asChild className="h-11 rounded-full px-6 text-sm font-semibold">
                                <Link href={route('patungan.create')}>
                                    <Plus className="size-4" /> Buat Patungan
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />
            ) : (
                <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {patungans.data.map((patungan) => (
                            <PatunganCard key={patungan.uuid} patungan={patungan} />
                        ))}
                    </div>

                    <Pagination
                        className="mt-8"
                        current={patungans.current_page}
                        last={patungans.last_page}
                        routeName="patungan.index"
                        params={{ status: filter === 'all' ? undefined : filter }}
                    />
                </>
            )}
        </PatunganLayout>
    );
}
