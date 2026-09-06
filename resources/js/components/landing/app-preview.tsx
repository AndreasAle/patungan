import { CategoryIcon } from '@/components/patungan/category-icon';
import { cn } from '@/lib/utils';
import { Check, Search } from 'lucide-react';

const participants = [
    { name: 'Andreas', amount: 'Rp25.000', paid: true },
    { name: 'Niko', amount: 'Rp25.000', paid: true },
    { name: 'Obet', amount: 'Rp25.000', paid: true },
    { name: 'Nanda', amount: 'Rp25.000', paid: false },
    { name: 'Nopit', amount: 'Rp25.000', paid: true },
];

/**
 * A live rendering of the real share page rather than a screenshot, so the
 * landing page can never drift out of date with the product.
 */
export function AppPreview({ className }: { className?: string }) {
    return (
        <div className={cn('border-border/60 bg-card overflow-hidden rounded-3xl border shadow-2xl', className)}>
            <div className="surface-deep px-5 py-5">
                <div className="flex items-start gap-3">
                    <CategoryIcon category="OLAHRAGA" size="sm" className="bg-white/15 text-white" />
                    <div className="min-w-0 flex-1">
                        <p className="text-brand-deep-foreground truncate text-sm font-bold tracking-tight">Badminton Minggu Malam</p>
                        <p className="text-brand-deep-muted mt-0.5 text-[11px]">Rp25.000 / orang</p>
                    </div>
                </div>

                <p className="text-brand-deep-foreground mt-4 text-2xl leading-none font-bold tracking-tight sm:text-3xl">Rp125.000</p>
                <p className="text-brand-deep-muted mt-1 text-[11px]">terkumpul dari Rp200.000</p>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div className="bg-lime h-full rounded-full" style={{ width: '62%' }} />
                </div>

                <p className="text-brand-deep-muted mt-2 text-[11px]">
                    <span className="text-brand-deep-foreground font-semibold">5</span> dari 8 sudah bayar
                </p>
            </div>

            <div className="px-4 py-4">
                <div className="border-input bg-background text-muted-foreground flex h-10 items-center gap-2 rounded-xl border px-3 text-xs">
                    <Search className="size-3.5" />
                    Cari nama kamu...
                </div>

                <ul className="mt-3 space-y-2">
                    {participants.map((participant) => (
                        <li
                            key={participant.name}
                            className={cn(
                                'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
                                participant.paid ? 'border-success/20 bg-success-soft/50' : 'border-border bg-card',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex size-8 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold',
                                    participant.paid ? 'bg-success text-success-foreground' : 'bg-brand-soft text-primary',
                                )}
                            >
                                {participant.paid ? <Check className="size-3.5" strokeWidth={3} /> : participant.name.charAt(0)}
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold">{participant.name}</p>
                                <p className="text-muted-foreground text-[10px]">{participant.amount}</p>
                            </div>

                            {participant.paid ? (
                                <span className="text-success text-[10px] font-semibold">Sudah bayar</span>
                            ) : (
                                <span className="bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-[10px] font-semibold">Bayar</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
