import { BalanceCard } from '@/components/patungan/balance-card';
import { BalanceHero } from '@/components/patungan/balance-hero';
import { ChaseList, type ChaseRow } from '@/components/patungan/chase-list';
import { CollectionGauge, type Collection } from '@/components/patungan/collection-gauge';
import { CommunityBanner } from '@/components/patungan/community-banner';
import { EmptyState } from '@/components/patungan/empty-state';
import { MascotGreeting } from '@/components/patungan/mascot-greeting';
import { PatunganCard } from '@/components/patungan/patungan-card';
import { QuickActions } from '@/components/patungan/quick-actions';
import { SectionHeading } from '@/components/patungan/section-heading';
import { StatCard, type MetricSeries } from '@/components/patungan/stat-card';
import { SummaryStrip } from '@/components/patungan/summary-strip';
import { WelcomeDialog } from '@/components/patungan/welcome-dialog';
import { ZoneMap, type ZoneBreakdown } from '@/components/patungan/zone-map';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Balance, DashboardStats, PatunganCard as PatunganCardData, SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowUpRight, Bell, CircleCheck, Plus, TrendingUp, Wallet } from 'lucide-react';
import type { CSSProperties } from 'react';

interface NotificationItem {
    id: string;
    data: { title?: string; body?: string };
    created_at: string;
}

interface Metrics {
    collected: MetricSeries;
    settled: MetricSeries;
    created: MetricSeries;
    collection: Collection;
    chase: ChaseRow[];
}

interface DashboardProps {
    balance: Balance;
    stats: DashboardStats;
    active: PatunganCardData[];
    history: PatunganCardData[];
    notifications: NotificationItem[];
    zones: ZoneBreakdown;
    metrics: Metrics;
}

export default function Dashboard({ balance, stats, active, history, notifications, zones, metrics }: DashboardProps) {
    const user = usePage<SharedData>().props.auth.user;

    return (
        <PatunganLayout
            wide
            heroMobileOnly
            title="Home"
            hero={<BalanceHero name={user?.name ?? ''} balance={balance} unreadCount={notifications.length} />}
        >
            <Head title="Dashboard" />
            <WelcomeDialog />

            <MascotGreeting
                className="rise-in mt-4 lg:mt-0 lg:mb-6"
                name={user?.name ?? ''}
                activeCount={stats.active_count}
                awaitingCount={stats.awaiting_count}
                collectedThisMonth={stats.collected_this_month}
            />

            {/* Desktop gets a title row instead of the green panel; the panel is
                a phone pattern, and on a wide screen it spends a third of the
                fold on one number. */}
            <div className="hidden items-end justify-between gap-4 lg:flex">
                <div>
                    <p className="text-muted-foreground text-[11px] font-bold tracking-[0.14em] uppercase">Selamat datang, {user?.name}</p>
                    <h1 className="display mt-2 text-3xl">Dashboard</h1>
                </div>

                <Button asChild className="h-11 rounded-full px-6 text-sm font-semibold">
                    <Link href={route('patungan.create')}>
                        <Plus className="size-4" />
                        Buat Patungan
                    </Link>
                </Button>
            </div>

            {/* The phone keeps the compact strip; the three stat cards below
                carry the same figures with their history on desktop. */}
            <div className="lg:hidden">
                <SummaryStrip stats={stats} />

                <div className="mt-4">
                    <QuickActions />
                </div>
            </div>

            <div className="mt-0 hidden gap-4 lg:mt-7 lg:grid lg:grid-cols-3">
                <StatCard
                    className="rise-in"
                    style={{ '--rise-index': 1 } as CSSProperties}
                    icon={TrendingUp}
                    label="Masuk bulan ini"
                    value={rupiah(metrics.collected.value)}
                    metric={metrics.collected}
                />
                <StatCard
                    className="rise-in"
                    style={{ '--rise-index': 2 } as CSSProperties}
                    icon={CircleCheck}
                    label="Peserta lunas"
                    value={`${metrics.settled.value}`}
                    suffix="orang"
                    metric={metrics.settled}
                />
                <StatCard
                    className="rise-in"
                    style={{ '--rise-index': 3 } as CSSProperties}
                    icon={Wallet}
                    label="Patungan dibuat"
                    value={`${metrics.created.value}`}
                    suffix={`bulan ini · ${stats.active_count} aktif`}
                    metric={metrics.created}
                />
            </div>

            {/* Gauge, chase list and map: the three things worth looking at
                before scrolling to the patungan themselves. */}
            <div className="mt-5 grid gap-4 lg:mt-4 lg:grid-cols-2 xl:grid-cols-[19rem_minmax(0,1fr)_minmax(0,1.15fr)]">
                <CollectionGauge collection={metrics.collection} />
                <ChaseList rows={metrics.chase} />
                <ZoneMap className="lg:col-span-2 xl:col-span-1" breakdown={zones} />
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                <BalanceCard className="hidden lg:block" balance={balance} />
                <CommunityBanner href={route('home')} members={`${zones.total > 0 ? zones.total : 200}+ pengguna`} />
            </div>

            <div className="mt-9 grid gap-9 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
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
                            <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                                {active.map((patungan) => (
                                    <PatunganCard key={patungan.uuid} patungan={patungan} />
                                ))}
                            </div>
                        )}
                    </section>

                    {history.length > 0 && (
                        <section className="mt-12">
                            <SectionHeading eyebrow="Arsip" title="Sudah selesai" />

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
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
