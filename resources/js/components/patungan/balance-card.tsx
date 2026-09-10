import { Button } from '@/components/ui/button';
import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Balance } from '@/types';
import { Link } from '@inertiajs/react';
import { ArrowDownToLine, Plus, Wallet } from 'lucide-react';

/**
 * The balance, on the one dark surface of the desktop dashboard.
 *
 * It is the only card with a filled background, which is the whole point: on a
 * page of white cards the eye lands here first, and this is the number an
 * organizer opens the app to see.
 */
export function BalanceCard({ balance, className }: { balance: Balance; className?: string }) {
    const rows = [
        ['Masih pending', balance.pending],
        ['Sudah dicairkan', balance.paid_out],
    ] as const;

    return (
        <section className={cn('surface-deep relative overflow-hidden rounded-3xl p-5 lg:p-6', className)}>
            {/* A soft light source top-right, so the panel is not a flat slab. */}
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -top-24 -right-16 size-64 rounded-full bg-[radial-gradient(circle,rgba(190,242,100,0.22),transparent_68%)]"
            />

            <div className="relative flex flex-wrap items-end justify-between gap-5">
                <div className="min-w-0">
                    <p className="text-brand-deep-muted flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] uppercase">
                        <Wallet className="text-lime size-3.5" strokeWidth={2.4} />
                        Saldo tersedia
                    </p>

                    <p className="display text-brand-deep-foreground mt-3 text-[32px] leading-none tabular-nums xl:text-[38px]">
                        {rupiah(balance.available)}
                    </p>

                    <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
                        {rows.map(([label, amount]) => (
                            <div key={label}>
                                <dt className="text-brand-deep-muted text-[11px]">{label}</dt>
                                <dd className="text-brand-deep-foreground mt-0.5 text-sm font-bold tabular-nums">{rupiah(amount)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>

                <div className="flex flex-wrap gap-2.5">
                    <Button asChild className="bg-lime text-lime-foreground hover:bg-lime/90 h-11 rounded-full px-5 text-sm font-semibold">
                        <Link href={route('patungan.create')}>
                            <Plus className="size-4" />
                            Buat Patungan
                        </Link>
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        className="text-brand-deep-foreground h-11 rounded-full border-white/25 bg-white/10 px-5 text-sm font-semibold hover:bg-white/20"
                    >
                        <Link href={route('payout.index')}>
                            <ArrowDownToLine className="size-4" />
                            Tarik Dana
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
