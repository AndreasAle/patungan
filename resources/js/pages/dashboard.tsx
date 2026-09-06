import { DashboardStat } from '@/components/patungan/dashboard-stat';
import { EmptyState } from '@/components/patungan/empty-state';
import { PatunganCard } from '@/components/patungan/patungan-card';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import type { Balance, PatunganCard as PatunganCardData, SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowDownToLine, Bell, Plus, Wallet } from 'lucide-react';

interface NotificationItem {
    id: string;
    data: { title?: string; body?: string };
    created_at: string;
}

interface DashboardProps {
    balance: Balance;
    active: PatunganCardData[];
    history: PatunganCardData[];
    notifications: NotificationItem[];
}

export default function Dashboard({ balance, active, history, notifications }: DashboardProps) {
    const user = usePage<SharedData>().props.auth.user;

    return (
        <PatunganLayout title="Home">
            <Head title="Dashboard" />

            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Hai, {user?.name.split(' ')[0]}</h1>
                    <p className="text-muted-foreground mt-0.5 text-sm">Ini ringkasan patungan kamu.</p>
                </div>

                <Button asChild className="hidden h-11 rounded-xl font-semibold lg:inline-flex">
                    <Link href={route('patungan.create')}>
                        <Plus className="size-4" />
                        Buat Patungan
                    </Link>
                </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <DashboardStat label="Saldo tersedia" amount={balance.available} emphasis />
                <DashboardStat label="Saldo pending" amount={balance.pending} hint="Pembayaran yang belum selesai" />
                <DashboardStat label="Sudah dicairkan" amount={balance.paid_out} />
            </div>

            <Button asChild variant="outline" className="mt-3 h-11 w-full rounded-xl font-semibold sm:w-auto">
                <Link href={route('payout.index')}>
                    <ArrowDownToLine className="size-4" />
                    Tarik dana
                </Link>
            </Button>

            {notifications.length > 0 && (
                <section className="mt-8">
                    <h2 className="text-muted-foreground text-sm font-semibold">Baru saja</h2>
                    <ul className="mt-3 space-y-2">
                        {notifications.map((notification) => (
                            <li key={notification.id} className="border-border bg-card flex items-start gap-3 rounded-2xl border px-4 py-3">
                                <Bell className="text-primary mt-0.5 size-4 shrink-0" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{notification.data.title}</p>
                                    <p className="text-muted-foreground truncate text-sm">{notification.data.body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="mt-8">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold tracking-tight">Patungan aktif</h2>
                    <Link href={route('patungan.index')} className="text-primary text-sm font-semibold">
                        Lihat semua
                    </Link>
                </div>

                {active.length === 0 ? (
                    <EmptyState
                        className="mt-3"
                        icon={Wallet}
                        title="Belum ada patungan."
                        description="Bikin patungan pertama kamu, lalu share linknya ke grup."
                        action={
                            <Button asChild className="h-11 rounded-xl font-semibold">
                                <Link href={route('patungan.create')}>Buat Patungan</Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {active.map((patungan) => (
                            <PatunganCard key={patungan.uuid} patungan={patungan} />
                        ))}
                    </div>
                )}
            </section>

            {history.length > 0 && (
                <section className="mt-8">
                    <h2 className="font-bold tracking-tight">Riwayat patungan</h2>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {history.map((patungan) => (
                            <PatunganCard key={patungan.uuid} patungan={patungan} />
                        ))}
                    </div>
                </section>
            )}
        </PatunganLayout>
    );
}
