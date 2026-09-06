import AppLogo from '@/components/app-logo';
import { FlashToast } from '@/components/patungan/flash-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowDownToLine, Home, LogOut, Plus, Receipt, Settings, ShieldCheck, User, Wallet, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface NavLink {
    label: string;
    href: string;
    icon: LucideIcon;
    match: string[];
}

const primaryNav: NavLink[] = [
    { label: 'Home', href: 'dashboard', icon: Home, match: ['/dashboard'] },
    { label: 'Patungan', href: 'patungan.index', icon: Wallet, match: ['/patungan'] },
    { label: 'Transaksi', href: 'transactions.index', icon: Receipt, match: ['/transaksi'] },
    { label: 'Pencairan', href: 'payout.index', icon: ArrowDownToLine, match: ['/pencairan'] },
];

const mobileNav: NavLink[] = [
    primaryNav[0],
    primaryNav[1],
    primaryNav[2],
    { label: 'Profil', href: 'profile.edit', icon: User, match: ['/settings'] },
];

function isActive(link: NavLink, pathname: string): boolean {
    return link.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface PatunganLayoutProps {
    children: ReactNode;
    /** Rendered above the page content on mobile as a compact title bar. */
    title?: string;
    back?: string;
    action?: ReactNode;
}

export default function PatunganLayout({ children, title, back, action }: PatunganLayoutProps) {
    const page = usePage<SharedData>();
    const user = page.props.auth.user;
    const pathname = new URL(page.url, 'http://localhost').pathname;

    return (
        <div className="bg-background min-h-screen">
            <FlashToast />

            {/* Desktop sidebar */}
            <aside className="border-sidebar-border bg-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r px-4 py-6 lg:flex">
                <Link href={route('dashboard')} className="px-2">
                    <AppLogo />
                </Link>

                <Button asChild className="mt-6 h-11 rounded-xl font-semibold">
                    <Link href={route('patungan.create')}>
                        <Plus className="size-4" />
                        Buat Patungan
                    </Link>
                </Button>

                <nav className="mt-6 flex flex-1 flex-col gap-1">
                    {primaryNav.map((link) => {
                        const active = isActive(link, pathname);

                        return (
                            <Link
                                key={link.href}
                                href={route(link.href)}
                                className={cn(
                                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                                    active
                                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                                        : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                                )}
                            >
                                <link.icon className="size-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-sidebar-border flex flex-col gap-1 border-t pt-4">
                    {user?.is_admin && (
                        <Link
                            href={route('admin.dashboard')}
                            className="text-sidebar-foreground hover:bg-sidebar-accent/60 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
                        >
                            <ShieldCheck className="size-4" />
                            Admin
                        </Link>
                    )}
                    <Link
                        href={route('profile.edit')}
                        className="text-sidebar-foreground hover:bg-sidebar-accent/60 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
                    >
                        <Settings className="size-4" />
                        Pengaturan
                    </Link>
                    <button
                        type="button"
                        onClick={() => router.post(route('logout'))}
                        className="text-sidebar-foreground hover:bg-sidebar-accent/60 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition"
                    >
                        <LogOut className="size-4" />
                        Keluar
                    </button>
                </div>
            </aside>

            <div className="lg:pl-64">
                {/* Mobile title bar */}
                <header className="border-border bg-background/90 sticky top-0 z-30 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden">
                    {back ? (
                        <Link href={back} className="text-muted-foreground -ml-1 rounded-lg p-1.5" aria-label="Kembali">
                            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </Link>
                    ) : (
                        <AppLogo showWordmark={false} />
                    )}
                    <span className="min-w-0 flex-1 truncate font-bold tracking-tight">{title ?? 'Patungan'}</span>
                    {action}
                </header>

                <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-28 lg:px-8 lg:pt-8 lg:pb-12">{children}</main>
            </div>

            {/* Mobile bottom navigation */}
            <nav className="border-border bg-background/95 pb-safe fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur lg:hidden">
                <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-1.5">
                    {mobileNav.slice(0, 2).map((link) => (
                        <NavTab key={link.href} link={link} pathname={pathname} />
                    ))}

                    <Link
                        href={route('patungan.create')}
                        className="bg-primary text-primary-foreground shadow-primary/25 mx-auto -mt-5 flex size-12 items-center justify-center rounded-2xl shadow-lg"
                        aria-label="Buat patungan"
                    >
                        <Plus className="size-6" strokeWidth={2.5} />
                    </Link>

                    {mobileNav.slice(2).map((link) => (
                        <NavTab key={link.href} link={link} pathname={pathname} />
                    ))}
                </div>
            </nav>
        </div>
    );
}

function NavTab({ link, pathname }: { link: NavLink; pathname: string }) {
    const active = isActive(link, pathname);

    return (
        <Link
            href={route(link.href)}
            className={cn(
                'flex flex-col items-center gap-1 rounded-lg py-1.5 text-[11px] font-medium transition',
                active ? 'text-primary' : 'text-muted-foreground',
            )}
        >
            <link.icon className="size-5" strokeWidth={active ? 2.4 : 2} />
            {link.label}
        </Link>
    );
}
