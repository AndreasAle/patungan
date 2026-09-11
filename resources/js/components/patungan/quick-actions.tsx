import { Link } from '@inertiajs/react';
import { ArrowDownToLine, Landmark, Receipt, Wallet, type LucideIcon } from 'lucide-react';

interface Action {
    label: string;
    hint: string;
    href: string;
    icon: LucideIcon;
    tone: string;
}

const actions: Action[] = [
    {
        label: 'Patungan',
        hint: 'Semua daftar',
        href: 'patungan.index',
        icon: Wallet,
        tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
    },
    {
        label: 'Transaksi',
        hint: 'Riwayat dana',
        href: 'transactions.index',
        icon: Receipt,
        tone: 'bg-teal-50 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
    },
    {
        label: 'Pencairan',
        hint: 'Tarik saldo',
        href: 'payout.index',
        icon: ArrowDownToLine,
        tone: 'bg-lime-100 text-emerald-800 dark:bg-lime-400/15 dark:text-lime-300',
    },
    {
        label: 'Rekening',
        hint: 'Tujuan tarik',
        href: 'payout.destinations',
        icon: Landmark,
        tone: 'bg-green-50 text-green-800 dark:bg-green-400/15 dark:text-green-300',
    },
];

/**
 * The shortcut row under the balance panel.
 *
 * Four direct destinations people revisit. The create action already lives in
 * the balance hero, so this row stays compact instead of repeating it.
 */
export function QuickActions() {
    return (
        <nav aria-label="Pintasan" className="px-1 py-2">
            <div className="grid grid-cols-4">
                {actions.map((action) => (
                    <Link
                        key={action.href}
                        href={route(action.href)}
                        className="group hover:bg-surface flex min-w-0 flex-col items-center rounded-2xl px-1.5 py-2 text-center transition"
                    >
                        <span
                            className={`${action.tone} flex size-11 items-center justify-center rounded-2xl transition group-hover:-translate-y-0.5 group-hover:shadow-sm`}
                        >
                            <action.icon className="size-[18px]" strokeWidth={2.2} />
                        </span>
                        <span className="text-foreground mt-2 w-full truncate text-[11px] font-semibold tracking-tight">{action.label}</span>
                        <span className="text-muted-foreground mt-0.5 hidden w-full truncate text-[9px] min-[390px]:block">{action.hint}</span>
                    </Link>
                ))}
            </div>
        </nav>
    );
}
