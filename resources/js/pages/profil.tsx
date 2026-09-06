import { InitialsAvatar } from '@/components/patungan/initials-avatar';
import PatunganLayout from '@/layouts/patungan-layout';
import { rupiah, rupiahShort } from '@/lib/format';
import type { Balance, SharedData } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowDownToLine,
    ChevronRight,
    KeyRound,
    Landmark,
    LogOut,
    Palette,
    Receipt,
    ShieldCheck,
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
    { label: 'Password', hint: 'Ganti kata sandi', icon: KeyRound, href: 'password.edit' },
    { label: 'Tampilan', hint: 'Terang atau gelap', icon: Palette, href: 'appearance' },
];

const money: MenuItem[] = [
    { label: 'Patungan', hint: 'Semua yang kamu bikin', icon: Wallet, href: 'patungan.index' },
    { label: 'Transaksi', hint: 'Riwayat dana masuk', icon: Receipt, href: 'transactions.index' },
    { label: 'Pencairan', hint: 'Tarik saldo kamu', icon: ArrowDownToLine, href: 'payout.index' },
    { label: 'Rekening tujuan', hint: 'Ke mana dana dikirim', icon: Landmark, href: 'payout.destinations' },
];

function MenuList({ title, items }: { title: string; items: MenuItem[] }) {
    return (
        <section className="mt-5">
            <h2 className="text-muted-foreground px-1 text-[11px] font-semibold tracking-wide uppercase">{title}</h2>

            <ul className="border-border bg-card divide-border mt-2 divide-y overflow-hidden rounded-2xl border">
                {items.map((item) => (
                    <li key={item.href}>
                        <Link href={route(item.href)} className="hover:bg-surface flex items-center gap-3 px-3.5 py-3 transition">
                            <span className="bg-brand-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                                <item.icon className="size-[18px]" strokeWidth={2.2} />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">{item.label}</span>
                                <span className="text-muted-foreground block truncate text-[11px]">{item.hint}</span>
                            </span>
                            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
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
                    <div className="flex items-center gap-3">
                        <InitialsAvatar name={user?.name ?? ''} size="lg" tone="onDeep" />

                        <div className="min-w-0 flex-1">
                            <h1 className="text-brand-deep-foreground truncate text-lg font-bold tracking-tight">{user?.name}</h1>
                            <p className="text-brand-deep-muted truncate text-xs">{user?.email}</p>
                            <span className="chip bg-lime text-lime-foreground mt-1.5">{user?.is_admin ? 'Admin' : 'Organizer'}</span>
                        </div>
                    </div>

                    <dl className="mt-5 grid grid-cols-3 gap-2">
                        {[
                            ['Patungan', stats.patungans.toString()],
                            ['Terkumpul', rupiahShort(stats.collected)],
                            ['Lunas', stats.completed.toString()],
                        ].map(([label, value]) => (
                            <div key={label} className="rounded-2xl bg-white/10 px-3 py-2.5">
                                <dt className="text-brand-deep-muted text-[10px]">{label}</dt>
                                <dd className="text-brand-deep-foreground mt-0.5 truncate text-sm font-bold tracking-tight">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            }
        >
            <Head title="Profil" />

            <Link
                href={route('payout.index')}
                className="border-border bg-card hover:border-primary/30 flex items-center gap-3 rounded-2xl border p-4 transition"
            >
                <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-[11px]">Saldo tersedia</p>
                    <p className="text-primary mt-0.5 text-xl font-bold tracking-tight tabular-nums">{rupiah(balance.available)}</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">
                        Pending {rupiah(balance.pending)} · Dicairkan {rupiah(balance.paid_out)}
                    </p>
                </div>
                <span className="bg-lime text-lime-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
                    <ArrowDownToLine className="size-4" strokeWidth={2.4} />
                </span>
            </Link>

            <MenuList title="Uang kamu" items={money} />
            <MenuList title="Akun" items={account} />

            {user?.is_admin && (
                <section className="mt-5">
                    <Link
                        href={route('admin.dashboard')}
                        className="border-border bg-card hover:border-primary/30 flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition"
                    >
                        <span className="bg-brand-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                            <ShieldCheck className="size-[18px]" strokeWidth={2.2} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">Panel admin</span>
                            <span className="text-muted-foreground block text-[11px]">Pantau seluruh platform</span>
                        </span>
                        <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                    </Link>
                </section>
            )}

            <button
                type="button"
                onClick={() => router.post(route('logout'))}
                className="border-destructive/25 text-destructive hover:bg-destructive/5 mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl border text-sm font-semibold transition"
            >
                <LogOut className="size-4" />
                Keluar
            </button>

            <p className="text-muted-foreground mt-5 text-center text-[11px]">Patungan · Kumpulin uang bareng tanpa drama.</p>
        </PatunganLayout>
    );
}
