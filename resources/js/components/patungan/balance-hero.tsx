import AppLogoIcon from '@/components/app-logo-icon';
import { Eyebrow } from '@/components/patungan/section-heading';
import { WalletHeroArt } from '@/components/patungan/wallet-hero-art';
import { rupiah } from '@/lib/format';
import type { Balance } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowDownToLine, Bell, Plus } from 'lucide-react';

interface BalanceHeroProps {
    name: string;
    balance: Balance;
    unreadCount: number;
}

/**
 * The dark green panel at the top of the dashboard: who you are, what you can
 * withdraw, and the two things you actually came to do.
 *
 * The balance is set in the same display type the landing page uses for its
 * headlines, so the app opens on the note the marketing site ends on. On wide
 * screens the actions move beside the figure rather than stretching across it.
 */
export function BalanceHero({ name, balance, unreadCount }: BalanceHeroProps) {
    const firstName = name.split(' ')[0];

    return (
        <div className="relative">
            <WalletHeroArt className="pointer-events-none absolute top-9 -right-8 w-48 opacity-95 sm:top-4 sm:right-2 sm:w-56" />

            <div className="relative z-10 flex items-center gap-3">
                <AppLogoIcon className="size-8 shrink-0 lg:hidden" plate />

                <div className="min-w-0 flex-1">
                    <p className="text-brand-deep-muted text-[11px]">Selamat datang,</p>
                    <p className="text-brand-deep-foreground truncate text-sm font-semibold">{firstName}</p>
                </div>

                <Link
                    href={route('profile.index')}
                    className="text-brand-deep-foreground relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/15"
                    aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
                >
                    <Bell className="size-[18px]" />
                    {unreadCount > 0 && <span className="bg-lime absolute top-2 right-2 size-2 rounded-full" />}
                </Link>
            </div>

            <div className="relative z-10 mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-8">
                <div className="max-w-[64%] min-w-0 sm:max-w-[70%]">
                    <Eyebrow onDeep>Saldo tersedia</Eyebrow>

                    <p className="display text-brand-deep-foreground mt-2 text-[29px] tabular-nums sm:text-[40px] lg:text-[44px]">
                        {rupiah(balance.available)}
                    </p>

                    {/* Hairline pair rather than a run-on sentence of numbers. */}
                    <dl className="divide-brand-deep-muted/25 border-brand-deep-muted/25 mt-3 flex divide-x border-t pt-3">
                        {[
                            ['Pending', balance.pending],
                            ['Sudah dicairkan', balance.paid_out],
                        ].map(([label, amount], index) => (
                            <div key={label as string} className={index === 0 ? 'pr-6' : 'pl-6'}>
                                <dt className="text-brand-deep-muted text-[10px] font-semibold tracking-[0.14em] uppercase">{label}</dt>
                                <dd className="text-brand-deep-foreground mt-1 text-sm font-bold tabular-nums">{rupiah(amount as number)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="mt-3 flex gap-2 sm:mt-4 lg:mt-0 lg:shrink-0 lg:pb-1">
                    <Link
                        href={route('patungan.create')}
                        className="bg-lime text-lime-foreground flex h-11 flex-[1.08] items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-semibold whitespace-nowrap transition hover:brightness-105 active:scale-[0.98] min-[360px]:text-xs lg:h-12 lg:flex-none lg:px-6 lg:text-sm"
                    >
                        <Plus className="size-4" strokeWidth={2.5} />
                        Buat Patungan
                    </Link>
                    <Link
                        href={route('payout.index')}
                        className="text-brand-deep-foreground ring-brand-deep-muted/30 flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-semibold whitespace-nowrap ring-1 transition hover:bg-white/10 active:scale-[0.98] min-[360px]:text-xs lg:h-12 lg:flex-none lg:px-6 lg:text-sm"
                    >
                        <ArrowDownToLine className="size-4" />
                        Tarik Dana
                    </Link>
                </div>
            </div>
        </div>
    );
}
