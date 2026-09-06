import { Link } from '@inertiajs/react';
import { ArrowDownToLine, Landmark, Plus, Receipt, Wallet, type LucideIcon } from 'lucide-react';

interface Action {
    label: string;
    hint: string;
    href: string;
    icon: LucideIcon;
}

const actions: Action[] = [
    { label: 'Buat', hint: 'Patungan baru', href: 'patungan.create', icon: Plus },
    { label: 'Patungan', hint: 'Semua daftar', href: 'patungan.index', icon: Wallet },
    { label: 'Transaksi', hint: 'Dana masuk', href: 'transactions.index', icon: Receipt },
    { label: 'Pencairan', hint: 'Tarik saldo', href: 'payout.index', icon: ArrowDownToLine },
    { label: 'Rekening', hint: 'Tujuan tarik', href: 'payout.destinations', icon: Landmark },
];

/**
 * The shortcut row under the balance panel.
 *
 * Cards rather than a grid of tiny glyphs: it scrolls sideways on a phone the
 * way the landing page rails do, and settles into five columns once there is
 * room for them.
 */
export function QuickActions() {
    return (
        <nav aria-label="Pintasan" className="rail-mobile sm:grid sm:grid-cols-5 sm:gap-3">
            {actions.map((action) => (
                <Link
                    key={action.href}
                    href={route(action.href)}
                    className="group border-border bg-card hover:border-primary/30 w-[8.5rem] rounded-2xl border p-4 transition hover:shadow-[0_1px_12px_rgba(16,66,44,0.06)] sm:w-auto"
                >
                    <span className="bg-brand-soft text-primary group-hover:bg-primary group-hover:text-primary-foreground flex size-9 items-center justify-center rounded-xl transition">
                        <action.icon className="size-[18px]" strokeWidth={2.2} />
                    </span>
                    <p className="text-foreground mt-3.5 text-sm font-bold tracking-tight">{action.label}</p>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">{action.hint}</p>
                </Link>
            ))}
        </nav>
    );
}
