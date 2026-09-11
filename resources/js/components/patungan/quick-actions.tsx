import { Link } from '@inertiajs/react';
import { ArrowDownToLine, Landmark, Plus, Receipt, Wallet, type LucideIcon } from 'lucide-react';

interface Action {
    label: string;
    hint: string;
    href: string;
    icon: LucideIcon;
    tone: string;
}

const actions: Action[] = [
    { label: 'Patungan', hint: 'Semua daftar', href: 'patungan.index', icon: Wallet, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Transaksi', hint: 'Riwayat dana', href: 'transactions.index', icon: Receipt, tone: 'bg-sky-50 text-sky-700' },
    { label: 'Pencairan', hint: 'Tarik saldo', href: 'payout.index', icon: ArrowDownToLine, tone: 'bg-amber-50 text-amber-700' },
    { label: 'Rekening', hint: 'Tujuan tarik', href: 'payout.destinations', icon: Landmark, tone: 'bg-violet-50 text-violet-700' },
];

/**
 * The shortcut row under the balance panel.
 *
 * One strong primary action followed by the four destinations people revisit.
 * This borrows the familiar wallet-home hierarchy without borrowing labels or
 * inventing features PATUNGAN does not have.
 */
export function QuickActions() {
    return (
        <nav aria-label="Pintasan" className="border-border bg-card overflow-hidden rounded-3xl border shadow-[0_1px_20px_rgba(16,66,44,0.05)]">
            <Link
                href={route('patungan.create')}
                className="group from-brand-soft/85 flex items-center gap-3 bg-gradient-to-r to-white px-4 py-4 transition hover:from-emerald-100/80"
            >
                <span className="bg-primary text-primary-foreground flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm transition group-hover:scale-105">
                    <Plus className="size-5" strokeWidth={2.4} />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="text-foreground block text-sm font-bold tracking-tight">Buat Patungan</span>
                    <span className="text-muted-foreground mt-0.5 block truncate text-[11px]">Mulai baru, lalu bagikan ke teman</span>
                </span>
                <span className="bg-primary text-primary-foreground shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold tracking-[0.08em]">BUAT</span>
            </Link>

            <div className="border-border grid grid-cols-4 border-t px-2 py-4">
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
