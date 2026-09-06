import { BalanceHero } from '@/components/patungan/balance-hero';
import { EmptyState } from '@/components/patungan/empty-state';
import { PatunganCard } from '@/components/patungan/patungan-card';
import { QuickActions } from '@/components/patungan/quick-actions';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import type { Balance, PatunganCard as PatunganCardData, SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Bell, Wallet } from 'lucide-react';

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
        <PatunganLayout title="Home" hero={<BalanceHero name={user?.name ?? ''} balance={balance} unreadCount={notifications.length} />}>
            <Head title="Dashboard" />

            <QuickActions />

            {notifications.length > 0 && (
                <section className="mt-6">
                    <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Baru saja</h2>
                    <ul className="mt-2.5 space-y-2">
                        {notifications.map((notification) => (
                            <li key={notification.id} className="border-border bg-card flex items-start gap-2.5 rounded-2xl border px-3.5 py-3">
                                <span className="bg-brand-soft text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
                                    <Bell className="size-3.5" />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold">{notification.data.title}</p>
                                    <p className="text-muted-foreground truncate text-xs">{notification.data.body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="mt-6">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-base font-bold tracking-tight">Patungan aktif</h2>
                    <Link href={route('patungan.index')} className="text-primary text-xs font-semibold">
                        Lihat semua
                    </Link>
                </div>

                {active.length === 0 ? (
                    <EmptyState
                        className="mt-2.5"
                        icon={Wallet}
                        title="Belum ada patungan"
                        description="Bikin patungan pertama kamu, lalu share linknya ke grup."
                        action={
                            <Button asChild className="h-10 rounded-xl text-sm font-semibold">
                                <Link href={route('patungan.create')}>Buat Patungan</Link>
                            </Button>
                        }
                    />
                ) : (
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                        {active.map((patungan) => (
                            <PatunganCard key={patungan.uuid} patungan={patungan} />
                        ))}
                    </div>
                )}
            </section>

            {history.length > 0 && (
                <section className="mt-6">
                    <h2 className="text-base font-bold tracking-tight">Riwayat patungan</h2>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                        {history.map((patungan) => (
                            <PatunganCard key={patungan.uuid} patungan={patungan} />
                        ))}
                    </div>
                </section>
            )}
        </PatunganLayout>
    );
}
