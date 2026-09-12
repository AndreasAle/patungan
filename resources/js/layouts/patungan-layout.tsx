import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import { FlashToast } from '@/components/patungan/flash-toast';
import { HelpBubble } from '@/components/patungan/help-bubble';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Link, router, usePage } from '@inertiajs/react';
import { ArrowDownToLine, ChevronLeft, Home, LogOut, Plus, Receipt, Settings, ShieldCheck, User, Wallet, type LucideIcon } from 'lucide-react';
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
    { label: 'Profil', href: 'profile.index', icon: User, match: ['/profil', '/settings'] },
];

function isActive(link: NavLink, pathname: string): boolean {
    return link.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface PatunganLayoutProps {
    children: ReactNode;
    title?: string;
    back?: string;
    action?: ReactNode;
    /** Rendered inside the deep green panel at the top, e.g. the balance block. */
    hero?: ReactNode;
    /** Widens the content column to the landing page's measure, for the dashboard. */
    wide?: boolean;
    /**
     * Keeps the green hero panel on phones but drops it on desktop, where the
     * page supplies its own header. The dashboard uses this; pages whose hero
     * is the whole point of the screen do not.
     */
    heroMobileOnly?: boolean;
    /** The create wizard keeps its own action pinned, so its tab bar belongs in the page flow. */
    mobileNavPosition?: 'fixed' | 'flow' | 'hidden';
}

export default function PatunganLayout({
    children,
    title,
    back,
    action,
    hero,
    wide = false,
    heroMobileOnly = false,
    mobileNavPosition = 'fixed',
}: PatunganLayoutProps) {
    const page = usePage<SharedData>();
    const user = page.props.auth.user;
    const pathname = new URL(page.url, 'http://localhost').pathname;
    /*
     * On a 1920px screen the old 1152px column left 500px of empty margin on
     * either side while the content below it stayed cramped. A finance screen
     * should use the width it is given.
     *
     * The cap keeps climbing past xl because people run wide monitors at 90%
     * zoom, which hands the page 2100+ CSS pixels - a single cap tuned for 1920
     * leaves half a column of nothing there. It is still a cap and not a plain
     * full width: past roughly 1600px a row of text stops being readable.
     */
    const measure = wide ? 'max-w-6xl xl:max-w-[84rem] 2xl:max-w-[100rem]' : 'max-w-4xl xl:max-w-5xl 2xl:max-w-6xl';

    return (
        /*
         * The desktop shell: a dark canvas with the application inset in a
         * rounded panel, rather than a light page running edge to edge. It is
         * what separates a finance product from a web page - the app reads as
         * one object sitting on a surface, and the sidebar belongs to it
         * instead of floating beside it.
         *
         * Phones get none of this. A 4px margin on a 360px screen is 2% of the
         * width thrown away to decorate a device nobody decorates.
         */
        <div className="bg-background lg:bg-brand-deep min-h-screen lg:p-3 xl:p-4">
            <FlashToast />

            {/*
                The frame carries no background of its own.

                It used to be light, and a dark sidebar sitting inside its
                rounded corner let that light colour show along the curve as a
                pale arc - the clip and the child's square corner do not
                anti-alias to the same pixels. Each column paints its own
                corner instead, so there is never a second colour underneath
                one to leak through.
            */}
            <div className="lg:shadow-brand-deep/40 lg:flex lg:min-h-[calc(100vh-1.5rem)] lg:overflow-clip lg:rounded-[28px] lg:shadow-2xl xl:min-h-[calc(100vh-2rem)] xl:rounded-[32px]">
                {/* Desktop rail */}
                {/*
                    Two elements, not one, and the outer is the whole point.
                    A sticky sidebar slides down its own column as the page
                    scrolls, and whatever it uncovers shows the frame behind it
                    - which is white. The column carries the dark background and
                    stands the full height of the frame; only its contents stick.
                */}
                <div className="bg-sidebar border-sidebar-border hidden shrink-0 border-r lg:block lg:w-60 lg:rounded-l-[28px] xl:rounded-l-[32px]">
                    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col px-3 py-5 lg:sticky lg:top-3 lg:flex lg:h-[calc(100vh-1.5rem)] xl:top-4 xl:h-[calc(100vh-2rem)]">
                        <Link href={route('dashboard')} className="px-2">
                            <AppLogo tone="onDeep" />
                        </Link>

                        <Button asChild className="bg-lime text-lime-foreground hover:bg-lime/90 mt-6 h-11 rounded-xl text-sm font-semibold">
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
                                                : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                                        )}
                                    >
                                        <link.icon className="size-[18px]" />
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="border-sidebar-border flex flex-col gap-1 border-t pt-3">
                            {user?.is_admin && (
                                <Link
                                    href={route('admin.dashboard')}
                                    className="text-sidebar-foreground hover:bg-sidebar-accent/50 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
                                >
                                    <ShieldCheck className="size-[18px]" />
                                    Admin
                                </Link>
                            )}
                            <Link
                                href={route('profile.index')}
                                className="text-sidebar-foreground hover:bg-sidebar-accent/50 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
                            >
                                <Settings className="size-[18px]" />
                                Profil & pengaturan
                            </Link>
                            <button
                                type="button"
                                onClick={() => router.post(route('logout'))}
                                className="text-sidebar-foreground hover:bg-sidebar-accent/50 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition"
                            >
                                <LogOut className="size-[18px]" />
                                Keluar
                            </button>
                        </div>
                    </aside>
                </div>

                <div className="lg:bg-background min-w-0 flex-1 lg:rounded-r-[28px] xl:rounded-r-[32px]">
                    {hero ? (
                        /* Deep green "money" panel; page content overlaps its lower edge. */
                        <header
                            className={cn(
                                'surface-deep rounded-b-[28px] px-4 pt-4 pb-16 lg:rounded-b-3xl lg:px-8 lg:pt-5 lg:pb-14',
                                heroMobileOnly && 'lg:hidden',
                            )}
                        >
                            <div className={cn('mx-auto w-full', measure)}>{hero}</div>
                        </header>
                    ) : (
                        <header className="surface-deep sticky top-0 z-30 flex h-14 items-center gap-2 px-4 lg:static lg:h-auto lg:bg-transparent lg:px-8 lg:pt-7 lg:pb-0">
                            {back ? (
                                <Link href={back} className="text-brand-deep-foreground/80 -ml-1.5 rounded-lg p-1.5 lg:hidden" aria-label="Kembali">
                                    <ChevronLeft className="size-5" />
                                </Link>
                            ) : (
                                <AppLogoIcon className="size-7 lg:hidden" plate />
                            )}
                            <span className="text-brand-deep-foreground min-w-0 flex-1 truncate text-base font-semibold lg:hidden">
                                {title ?? 'Patungan'}
                            </span>
                            <div className="lg:hidden">{action}</div>
                        </header>
                    )}

                    <main
                        className={cn(
                            'relative z-10 mx-auto w-full px-4 pb-24 lg:px-8 lg:pb-12',
                            measure,
                            hero ? '-mt-12' : 'pt-5 lg:pt-10',
                            hero && (heroMobileOnly ? 'lg:mt-0 lg:pt-7' : 'lg:-mt-14'),
                        )}
                    >
                        {children}
                    </main>
                </div>
            </div>

            {/* On wizard pages this also clears the pinned step action. */}
            <HelpBubble className="bottom-24 lg:bottom-4" />

            {/* A focused wizard hides app navigation because its own action owns the viewport edge. */}
            {mobileNavPosition !== 'hidden' && (
                <nav
                    className={cn('pb-safe inset-x-0 z-40 px-3 lg:hidden', mobileNavPosition === 'fixed' ? 'fixed bottom-0' : 'relative pt-2 pb-24')}
                >
                    <div className="border-border/70 bg-card/95 mx-auto grid max-w-md grid-cols-5 items-center gap-1 rounded-[26px] border px-2 py-2 shadow-[0_8px_30px_rgba(16,66,44,0.14)] backdrop-blur-sm">
                        {mobileNav.slice(0, 2).map((link) => (
                            <NavTab key={link.href} link={link} pathname={pathname} />
                        ))}

                        <div className="flex justify-center">
                            <Link
                                href={route('patungan.create')}
                                className="bg-primary text-primary-foreground shadow-primary/30 ring-card flex size-12 -translate-y-3 items-center justify-center rounded-2xl shadow-lg ring-4 transition active:scale-95"
                                aria-label="Buat patungan"
                            >
                                <Plus className="size-5" strokeWidth={2.6} />
                            </Link>
                        </div>

                        {mobileNav.slice(2).map((link) => (
                            <NavTab key={link.href} link={link} pathname={pathname} />
                        ))}
                    </div>
                </nav>
            )}
        </div>
    );
}

function NavTab({ link, pathname }: { link: NavLink; pathname: string }) {
    const active = isActive(link, pathname);

    return (
        <Link
            href={route(link.href)}
            aria-current={active ? 'page' : undefined}
            className={cn(
                'flex flex-col items-center gap-1 rounded-2xl py-1.5 transition',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
        >
            <span className={cn('flex h-7 w-11 items-center justify-center rounded-full transition', active ? 'bg-brand-soft' : 'bg-transparent')}>
                <link.icon className="size-[18px]" strokeWidth={active ? 2.5 : 2} />
            </span>
            <span className={cn('text-[10px] leading-none', active ? 'font-bold' : 'font-medium')}>{link.label}</span>
        </Link>
    );
}
