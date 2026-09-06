import { Link } from '@inertiajs/react';
import { ArrowDownToLine, Landmark, Plus, Receipt, Wallet, type LucideIcon } from 'lucide-react';

interface Action {
    label: string;
    href: string;
    icon: LucideIcon;
}

const actions: Action[] = [
    { label: 'Buat', href: 'patungan.create', icon: Plus },
    { label: 'Patungan', href: 'patungan.index', icon: Wallet },
    { label: 'Transaksi', href: 'transactions.index', icon: Receipt },
    { label: 'Pencairan', href: 'payout.index', icon: ArrowDownToLine },
    { label: 'Rekening', href: 'payout.destinations', icon: Landmark },
];

/** The shortcut grid that sits over the green panel, like a wallet home screen. */
export function QuickActions() {
    return (
        <section className="border-border bg-card rounded-2xl border p-3">
            <ul className="grid grid-cols-5 gap-1">
                {actions.map((action) => (
                    <li key={action.href}>
                        <Link
                            href={route(action.href)}
                            className="hover:bg-surface flex flex-col items-center gap-1.5 rounded-xl px-1 py-2 transition"
                        >
                            <span className="bg-brand-soft text-primary flex size-10 items-center justify-center rounded-xl">
                                <action.icon className="size-[18px]" strokeWidth={2.2} />
                            </span>
                            <span className="text-muted-foreground text-center text-[10px] leading-tight font-medium">{action.label}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
