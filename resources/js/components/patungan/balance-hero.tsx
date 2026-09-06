import AppLogoIcon from '@/components/app-logo-icon';
import { Eyebrow } from '@/components/patungan/section-heading';
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
        <div>
            <div className="flex items-center gap-3">
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

            <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
                <div className="min-w-0">
                    <Eyebrow onDeep>Saldo tersedia</Eyebrow>

                    <p className="display text-brand-deep-foreground mt-3 text-[29px] tabular-nums sm:text-5xl lg:text-[56px]">
                        {rupiah(balance.available)}
                    </p>

                    {/* Hairline pair rather than a run-on sentence of numbers. */}
                    <dl className="divide-brand-deep-muted/25 border-brand-deep-muted/25 mt-5 flex divide-x border-t pt-4">
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

                <div className="flex gap-2.5 lg:shrink-0 lg:pb-1">
                    <Link
                        href={route('patungan.create')}
                        className="bg-lime text-lime-foreground flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition hover:brightness-105 active:scale-[0.98] lg:flex-none"
                    >
                        <Plus className="size-4" strokeWidth={2.5} />
                        Buat Patungan
                    </Link>
                    <Link
                        href={route('payout.index')}
                        className="text-brand-deep-foreground ring-brand-deep-muted/30 flex h-12 flex-1 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold ring-1 transition hover:bg-white/10 active:scale-[0.98] lg:flex-none"
                    >
                        <ArrowDownToLine className="size-4" />
                        Tarik Dana
                    </Link>
                </div>
            </div>
        </div>
    );
}
