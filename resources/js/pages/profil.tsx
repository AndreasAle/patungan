import { InitialsAvatar } from '@/components/patungan/initials-avatar';
import PatunganLayout from '@/layouts/patungan-layout';
import { rupiah, rupiahShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Balance, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ArrowUpRight,
    ChevronRight,
    KeyRound,
    Landmark,
    LogOut,
    Palette,
    Receipt,
    ShieldCheck,
    Sparkles,
    UserPen,
    Wallet,
    type LucideIcon,
} from 'lucide-react';

interface ProfilProps {
    stats: { patungans: number; collected: number; completed: number };
    balance: Balance;
}

interface MenuItem {
    label: string;
    hint: string;
    icon: LucideIcon;
    href: string;
}

const account: MenuItem[] = [
    { label: 'Ubah profil', hint: 'Nama dan email', icon: UserPen, href: 'profile.edit' },
    { label: 'Keamanan akun', hint: 'Ganti kata sandi', icon: KeyRound, href: 'password.edit' },
    { label: 'Tampilan', hint: 'Terang atau gelap', icon: Palette, href: 'appearance' },
];

const money: MenuItem[] = [
    { label: 'Patungan', hint: 'Semua patunganmu', icon: Wallet, href: 'patungan.index' },
    { label: 'Transaksi', hint: 'Aktivitas saldo', icon: Receipt, href: 'transactions.index' },
    { label: 'Pencairan', hint: 'Tarik saldo', icon: ArrowDownToLine, href: 'payout.index' },
    { label: 'Rekening', hint: 'Tujuan pencairan', icon: Landmark, href: 'payout.destinations' },
];

function MoneyGrid() {
    return (
        <section>
            <div className="flex items-end justify-between px-1">
                <div>
                    <p className="text-primary text-[9px] font-extrabold tracking-[0.16em] uppercase">Akses cepat</p>
                    <h2 className="display mt-1 text-lg">Uang kamu</h2>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
                {money.map((item, index) => (
                    <Link
                        key={item.href}
                        href={route(item.href)}
                        className={cn(
                            'group border-primary/10 relative min-h-28 overflow-hidden rounded-[1.4rem] border p-4 transition hover:-translate-y-1 hover:shadow-lg',
                            index === 0
                                ? 'bg-primary text-primary-foreground'
                                : 'from-card to-brand-soft/55 hover:border-primary/25 bg-gradient-to-br',
                        )}
                    >
                        <span
                            className={cn(
                                'flex size-9 items-center justify-center rounded-xl',
                                index === 0 ? 'bg-lime text-lime-foreground' : 'bg-brand-soft text-primary',
                            )}
                        >
                            <item.icon className="size-[18px]" strokeWidth={2.2} />
                        </span>
                        <ArrowUpRight
                            className={cn(
                                'absolute top-4 right-4 size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5',
                                index === 0 ? 'text-primary-foreground/55' : 'text-muted-foreground',
                            )}
                        />
                        <p className="mt-3 text-sm font-extrabold tracking-tight">{item.label}</p>
                        <p className={cn('mt-0.5 text-[10px]', index === 0 ? 'text-primary-foreground/60' : 'text-muted-foreground')}>{item.hint}</p>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function AccountList() {
    return (
        <section>
            <div className="px-1">
                <p className="text-primary text-[9px] font-extrabold tracking-[0.16em] uppercase">Preferensi</p>
                <h2 className="display mt-1 text-lg">Akun</h2>
            </div>

            <ul className="border-border bg-card divide-border mt-3 divide-y overflow-hidden rounded-[1.4rem] border shadow-[0_18px_50px_-44px_rgba(5,74,52,.5)]">
                {account.map((item) => (
                    <li key={item.href}>
                        <Link
                            href={route(item.href)}
                            className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-emerald-50/45 dark:hover:bg-emerald-400/5"
                        >
                            <span className="bg-brand-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105">
                                <item.icon className="size-[17px]" strokeWidth={2.2} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold tracking-tight">{item.label}</span>
                                <span className="text-muted-foreground block truncate text-[10px]">{item.hint}</span>
                            </span>
                            <ChevronRight className="text-muted-foreground group-hover:text-primary size-4 shrink-0 transition group-hover:translate-x-0.5" />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function Profil({ stats, balance }: ProfilProps) {
    const user = usePage<SharedData>().props.auth.user;

    return (
        <PatunganLayout
            title="Profil"
            hero={
                <div>
                    <div className="flex items-center gap-3.5">
                        <div className="relative">
                            <InitialsAvatar name={user?.name ?? ''} size="lg" tone="onDeep" className="size-[68px] text-lg" />
                            <span className="bg-lime ring-brand-deep absolute -right-0.5 -bottom-0.5 size-4 rounded-full ring-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-lime flex items-center gap-1 text-[9px] font-bold tracking-[0.14em] uppercase">
                                <Sparkles className="size-3" /> Profil kamu
                            </p>
                            <h1 className="display text-brand-deep-foreground mt-1 truncate text-xl sm:text-2xl">{user?.name}</h1>
                            <p className="text-brand-deep-muted mt-0.5 truncate text-[11px]">{user?.email}</p>
                        </div>

                        <Link
                            href={route('profile.edit')}
                            aria-label="Ubah profil"
                            className="text-brand-deep-foreground flex size-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 transition hover:bg-white/15"
                        >
                            <UserPen className="size-[18px]" />
                        </Link>
                    </div>

                    <dl className="mt-5 grid grid-cols-3 gap-2">
                        {[
                            ['Patungan', stats.patungans.toString()],
                            ['Terkumpul', rupiahShort(stats.collected)],
                            ['Lunas', stats.completed.toString()],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.07] px-3 py-2.5 backdrop-blur-sm">
                                <dt className="text-brand-deep-muted truncate text-[8px] font-bold tracking-[0.12em] uppercase">{label}</dt>
                                <dd className="display text-brand-deep-foreground mt-1 truncate text-base tabular-nums sm:text-lg">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            }
        >
            <Head title="Profil" />

            <Link
                href={route('payout.index')}
                className="group border-primary/15 from-card via-card relative flex items-center gap-4 overflow-hidden rounded-[1.65rem] border bg-gradient-to-br to-lime-50/80 p-5 shadow-[0_20px_55px_-40px_rgba(5,74,52,.7)] transition hover:-translate-y-0.5 hover:shadow-lg dark:to-lime-400/5"
            >
                <span aria-hidden="true" className="absolute -right-10 -bottom-16 size-36 rounded-full bg-lime-300/15 blur-xl" />
                <div className="relative min-w-0 flex-1">
                    <p className="text-primary flex items-center gap-1.5 text-[9px] font-extrabold tracking-[0.15em] uppercase">
                        <Wallet className="size-3" /> Saldo tersedia
                    </p>
                    <p className="display text-primary mt-1.5 text-3xl tabular-nums">{rupiah(balance.available)}</p>
                    <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
                        <span>Pending {rupiah(balance.pending)}</span>
                        <span>Dicairkan {rupiah(balance.paid_out)}</span>
                    </div>
                </div>
                <span className="bg-lime text-lime-foreground relative flex h-11 shrink-0 items-center gap-2 rounded-2xl px-3.5 text-xs font-bold shadow-sm transition group-hover:scale-105">
                    Tarik <ArrowDownToLine className="size-4" />
                </span>
            </Link>

            <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.1fr_.9fr]">
                <MoneyGrid />
                <AccountList />
            </div>

            {user?.is_admin && (
                <Link
                    href={route('admin.dashboard')}
                    className="border-primary/15 bg-brand-soft/55 hover:border-primary/30 mt-6 flex items-center gap-3 rounded-2xl border px-4 py-3.5 transition"
                >
                    <span className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <ShieldCheck className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">Panel admin</span>
                        <span className="text-muted-foreground block text-[10px]">Pantau seluruh platform</span>
                    </span>
                    <ChevronRight className="text-primary size-4" />
                </Link>
            )}

            <button
                type="button"
                onClick={() => router.post(route('logout'))}
                className="border-destructive/20 text-destructive hover:bg-destructive/5 mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border text-xs font-bold transition lg:w-auto lg:px-6"
            >
                <LogOut className="size-4" /> Keluar
            </button>

            <p className="text-muted-foreground mt-6 text-center text-[10px]">Patungan · Bayar bagianmu, beres.</p>
        </PatunganLayout>
    );
}
