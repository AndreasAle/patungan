import { EmptyState } from '@/components/patungan/empty-state';
import { Pagination } from '@/components/patungan/pagination';
import { PatunganCard } from '@/components/patungan/patungan-card';
import { PageHeader } from '@/components/patungan/section-heading';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import type { Paginated, PatunganCard as PatunganCardData } from '@/types';
import { Head, Link } from '@inertiajs/react';
import { Plus, Wallet } from 'lucide-react';

export default function PatunganIndex({ patungans }: { patungans: Paginated<PatunganCardData> }) {
    return (
        <PatunganLayout wide title="Patungan">
            <Head title="Patungan" />

            <PageHeader
                eyebrow={`${patungans.total} total`}
                title="Patungan"
                description="Semua patungan yang kamu buat, yang masih jalan maupun yang sudah selesai."
                action={
                    <Button asChild className="hidden h-11 rounded-full px-6 text-sm font-semibold lg:inline-flex">
                        <Link href={route('patungan.create')}>
                            <Plus className="size-4" />
                            Buat Patungan
                        </Link>
                    </Button>
                }
            />

            {patungans.data.length === 0 ? (
                <EmptyState
                    className="mt-6"
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
                    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
