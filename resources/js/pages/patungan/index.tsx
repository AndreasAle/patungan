import { EmptyState } from '@/components/patungan/empty-state';
import { PatunganCard } from '@/components/patungan/patungan-card';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import type { Paginated, PatunganCard as PatunganCardData } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Wallet } from 'lucide-react';

export default function PatunganIndex({ patungans }: { patungans: Paginated<PatunganCardData> }) {
    return (
        <PatunganLayout title="Patungan">
            <Head title="Patungan" />

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Patungan</h1>
                    <p className="text-muted-foreground mt-0.5 text-xs">{patungans.total} patungan total</p>
                </div>

                <Button asChild className="hidden h-11 rounded-xl font-semibold lg:inline-flex">
                    <Link href={route('patungan.create')}>Buat Patungan</Link>
                </Button>
            </div>

            {patungans.data.length === 0 ? (
                <EmptyState
                    className="mt-6"
                    icon={Wallet}
                    title="Belum ada patungan."
                    description="Semua patungan yang kamu buat akan muncul di sini."
                    action={
                        <Button asChild className="h-11 rounded-xl font-semibold">
                            <Link href={route('patungan.create')}>Buat Patungan</Link>
                        </Button>
                    }
                />
            ) : (
                <>
                    <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        {patungans.data.map((patungan) => (
                            <PatunganCard key={patungan.uuid} patungan={patungan} />
                        ))}
                    </div>

                    {patungans.last_page > 1 && (
                        <div className="mt-6 flex items-center justify-center gap-3">
                            <Button
                                variant="outline"
                                disabled={patungans.current_page === 1}
                                onClick={() => router.get(route('patungan.index'), { page: patungans.current_page - 1 }, { preserveScroll: true })}
                            >
                                Sebelumnya
                            </Button>
                            <span className="text-muted-foreground text-sm">
                                {patungans.current_page} / {patungans.last_page}
                            </span>
                            <Button
                                variant="outline"
                                disabled={patungans.current_page === patungans.last_page}
                                onClick={() => router.get(route('patungan.index'), { page: patungans.current_page + 1 }, { preserveScroll: true })}
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
