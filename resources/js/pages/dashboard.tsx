import { BalanceHero } from '@/components/patungan/balance-hero';
import { EmptyState } from '@/components/patungan/empty-state';
import { PatunganCard } from '@/components/patungan/patungan-card';
import { QuickActions } from '@/components/patungan/quick-actions';
import { SectionHeading } from '@/components/patungan/section-heading';
import { SummaryStrip } from '@/components/patungan/summary-strip';
import { WelcomeDialog } from '@/components/patungan/welcome-dialog';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Balance, DashboardStats, PatunganCard as PatunganCardData, SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, Bell, Wallet } from 'lucide-react';

interface NotificationItem {
    id: string;
    data: { title?: string; body?: string };
    created_at: string;
}

interface DashboardProps {
    balance: Balance;
    stats: DashboardStats;
    active: PatunganCardData[];
    history: PatunganCardData[];
    notifications: NotificationItem[];
}

export default function Dashboard({ balance, stats, active, history, notifications }: DashboardProps) {
    const user = usePage<SharedData>().props.auth.user;

    return (
        <PatunganLayout wide title="Home" hero={<BalanceHero name={user?.name ?? ''} balance={balance} unreadCount={notifications.length} />}>
            <Head title="Dashboard" />
            <WelcomeDialog />

            <SummaryStrip stats={stats} />

            <div className="mt-4">
                <QuickActions />
            </div>

            {/* The list carries the page; the aside holds what you only glance at. */}
            <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-12">
                <div className="min-w-0">
                    <section>
                        <SectionHeading
                            eyebrow="Sedang jalan"
                            title="Patungan aktif"
                            action={active.length > 0 ? { label: 'Lihat semua', href: route('patungan.index') } : undefined}
                        />

                        {active.length === 0 ? (
                            <EmptyState
                                className="mt-5"
                                icon={Wallet}
                                title="Belum ada patungan"
                                description="Bikin patungan pertama kamu, lalu share linknya ke grup."
                                action={
                                    <Button asChild className="h-11 rounded-full px-6 text-sm font-semibold">
                                        <Link href={route('patungan.create')}>Buat Patungan</Link>
                                    </Button>
                                }
                            />
                        ) : (
                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {active.map((patungan) => (
                                    <PatunganCard key={patungan.uuid} patungan={patungan} />
                                ))}
                            </div>
                        )}
                    </section>

                    {history.length > 0 && (
                        <section className="mt-12">
                            <SectionHeading eyebrow="Arsip" title="Sudah selesai" />

                            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                                {history.map((patungan) => (
                                    <PatunganCard key={patungan.uuid} patungan={patungan} />
                                ))}
                            </div>
                        </section>
                    )}
                </div>

                <aside className="min-w-0 space-y-4">
                    <ActivityPanel notifications={notifications} />
                    {/* The hero already carries all three figures on a phone. */}
                    <WalletPanel className="hidden lg:block" balance={balance} />
                </aside>
            </div>
        </PatunganLayout>
    );
}

/** Unread notifications, or an honest note that there is nothing new. */
function ActivityPanel({ notifications }: { notifications: NotificationItem[] }) {
    return (
        <section className="border-border bg-card rounded-3xl border p-5">
            <h2 className="text-muted-foreground text-[11px] font-bold tracking-[0.18em] uppercase">Aktivitas</h2>

            {notifications.length === 0 ? (
                <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
                    Belum ada yang baru. Begitu ada yang bayar, kabarnya muncul di sini.
                </p>
            ) : (
                <ul className="divide-border mt-2 divide-y">
                    {notifications.map((notification) => (
                        <li key={notification.id} className="flex items-start gap-3 py-3.5 first:pt-2 last:pb-0">
                            <span className="bg-brand-soft text-primary mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg">
                                <Bell className="size-3.5" />
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold tracking-tight">{notification.data.title}</p>
                                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[11px] leading-relaxed">{notification.data.body}</p>
                                <p className="text-muted-foreground/70 mt-1 text-[10px]">{formatDateTime(notification.created_at)}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

/** Where the money sits right now, and the one link that moves it. */
function WalletPanel({ balance, className }: { balance: Balance; className?: string }) {
    const rows = [
        ['Tersedia', balance.available],
        ['Masih pending', balance.pending],
        ['Sudah dicairkan', balance.paid_out],
    ] as const;

    return (
        <section className={cn('border-border bg-card rounded-3xl border p-5', className)}>
            <h2 className="text-muted-foreground text-[11px] font-bold tracking-[0.18em] uppercase">Dompet</h2>

            <dl className="divide-border mt-2 divide-y">
                {rows.map(([label, amount]) => (
                    <div key={label} className="flex items-center justify-between gap-3 py-3">
                        <dt className="text-muted-foreground text-xs">{label}</dt>
                        <dd className="text-foreground text-sm font-bold tabular-nums">{rupiah(amount)}</dd>
                    </div>
                ))}
            </dl>

            <Link href={route('payout.index')} className="text-primary group mt-3 inline-flex items-center gap-1 text-xs font-semibold">
                Cairkan saldo
                <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
        </section>
    );
}
