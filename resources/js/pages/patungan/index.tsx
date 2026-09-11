import { EmptyState } from '@/components/patungan/empty-state';
import { Pagination } from '@/components/patungan/pagination';
import { PatunganCard } from '@/components/patungan/patungan-card';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import type { Paginated, PatunganCard as PatunganCardData } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Layers3, Plus, Wallet } from 'lucide-react';

export default function PatunganIndex({ patungans }: { patungans: Paginated<PatunganCardData> }) {
    return (
        <PatunganLayout wide title="Patungan">
            <Head title="Patungan" />

            <section className="dark:via-card relative overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-5 py-5 sm:px-7 sm:py-6 dark:border-emerald-400/15 dark:from-emerald-400/10 dark:to-lime-400/10">
                <span aria-hidden="true" className="absolute -top-16 -right-12 size-40 rounded-full border-[24px] border-lime-300/25" />

                <div className="relative flex items-start gap-4">
                    <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl">
                        <Layers3 className="size-5" strokeWidth={2.2} />
                    </span>

                    <div className="min-w-0 flex-1">
                        <p className="text-primary text-[10px] font-extrabold tracking-[0.16em] uppercase">Daftar patungan</p>
                        <h1 className="display mt-1.5 text-[24px] sm:text-3xl">Patungan kamu</h1>
                        <p className="text-muted-foreground mt-2 max-w-lg text-xs leading-relaxed sm:text-sm">
                            Pantau pembayaran yang masih berjalan dan buka kembali riwayat yang sudah selesai.
                        </p>
                    </div>

                    <div className="bg-brand-deep text-brand-deep-foreground hidden min-w-20 shrink-0 rounded-2xl px-4 py-3 text-center sm:block">
                        <p className="display text-2xl tabular-nums">{patungans.total}</p>
                        <p className="text-brand-deep-muted mt-0.5 text-[9px] font-bold tracking-[0.12em] uppercase">Total</p>
                    </div>
                </div>

                <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-emerald-100 pt-4 dark:border-emerald-300/10">
                    <span className="inline-flex items-center gap-2 text-xs font-semibold">
                        <span className="bg-lime size-2 rounded-full" />
                        {patungans.total} patungan tersimpan
                    </span>

                    <Button asChild className="hidden h-10 rounded-full px-5 text-xs font-bold lg:inline-flex">
                        <Link href={route('patungan.create')}>
                            <Plus className="size-4" />
                            Buat Patungan
                        </Link>
                    </Button>
                </div>
            </section>

            {patungans.data.length === 0 ? (
                <EmptyState
                    className="mt-5"
                    icon={Wallet}
                    title="Belum ada patungan."
                    description="Semua patungan yang kamu buat akan muncul di sini."
                    action={
                        <Button asChild className="h-11 rounded-full px-6 text-sm font-semibold">
                            <Link href={route('patungan.create')}>Buat Patungan</Link>
                        </Button>
                    }
                />
            ) : (
                <>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                        {patungans.data.map((patungan) => (
                            <PatunganCard key={patungan.uuid} patungan={patungan} />
                        ))}
                    </div>

                    <Pagination className="mt-8" current={patungans.current_page} last={patungans.last_page} routeName="patungan.index" />
                </>
            )}
        </PatunganLayout>
    );
}
