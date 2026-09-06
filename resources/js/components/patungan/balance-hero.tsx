import AppLogoIcon from '@/components/app-logo-icon';
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
 */
export function BalanceHero({ name, balance, unreadCount }: BalanceHeroProps) {
    const firstName = name.split(' ')[0];

    return (
        <div>
            <div className="flex items-center gap-3">
                <AppLogoIcon className="size-8 shrink-0" />

                <div className="min-w-0 flex-1">
                    <p className="text-brand-deep-muted text-[11px]">Selamat datang,</p>
                    <p className="text-brand-deep-foreground truncate text-sm font-semibold">{firstName}</p>
                </div>

                <Link
                    href={route('profile.index')}
                    className="text-brand-deep-foreground relative flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10"
                    aria-label={unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : 'Notifikasi'}
                >
                    <Bell className="size-[18px]" />
                    {unreadCount > 0 && <span className="bg-lime absolute top-2 right-2 size-2 rounded-full" />}
                </Link>
            </div>

            <div className="mt-6">
                <p className="text-brand-deep-muted text-xs">Saldo tersedia</p>
                <p className="text-brand-deep-foreground mt-1 text-[30px] leading-none font-bold tracking-tight sm:text-4xl">
                    {rupiah(balance.available)}
                </p>

                <div className="text-brand-deep-muted mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                    <span>
                        Pending <span className="text-brand-deep-foreground font-semibold">{rupiah(balance.pending)}</span>
                    </span>
                    <span>
                        Dicairkan <span className="text-brand-deep-foreground font-semibold">{rupiah(balance.paid_out)}</span>
                    </span>
                </div>
            </div>

            <div className="mt-5 flex gap-2.5">
                <Link
                    href={route('patungan.create')}
                    className="bg-lime text-lime-foreground flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition active:scale-[0.98]"
                >
                    <Plus className="size-4" strokeWidth={2.5} />
                    Buat Patungan
                </Link>
                <Link
                    href={route('payout.index')}
                    className="text-brand-deep-foreground flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-semibold transition active:scale-[0.98]"
                >
                    <ArrowDownToLine className="size-4" />
                    Tarik Dana
                </Link>
            </div>
        </div>
    );
}
