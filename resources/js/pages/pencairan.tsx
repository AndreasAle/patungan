import InputError from '@/components/input-error';
import { EmptyState } from '@/components/patungan/empty-state';
import { RupiahInput } from '@/components/patungan/rupiah-input';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Balance } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowDownToLine, Check, Info, Landmark, Plus } from 'lucide-react';
import type { FormEvent } from 'react';

interface Destination {
    id: number;
    type: string;
    label: string;
    account_holder: string;
    is_default: boolean;
}

interface SettlementRow {
    uuid: string;
    amount: number;
    net_amount: number;
    status: string;
    status_label: string;
    destination: string;
    requested_at: string | null;
    processed_at: string | null;
    failure_reason: string | null;
}

interface PencairanProps {
    balance: Balance;
    destinations: Destination[];
    settlements: SettlementRow[];
    payout: { min_amount: number; provider: string; automated: boolean };
}

export default function Pencairan({ balance, destinations, settlements, payout }: PencairanProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        payout_destination_id: destinations.find((destination) => destination.is_default)?.id ?? destinations[0]?.id ?? 0,
        amount: 0,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(route('payout.store'), { preserveScroll: true, onSuccess: () => reset('amount') });
    };

    const tooMuch = data.amount > balance.available;
    const belowMinimum = data.amount > 0 && data.amount < payout.min_amount;

    return (
        <PatunganLayout
            title="Pencairan"
            hero={
                <div>
                    <p className="text-brand-deep-muted text-[11px]">Saldo tersedia</p>
                    <p className="text-brand-deep-foreground mt-1 text-[30px] leading-none font-bold tracking-tight sm:text-4xl">
                        {rupiah(balance.available)}
                    </p>

                    <dl className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-2xl bg-white/10 px-3 py-2.5">
                            <dt className="text-brand-deep-muted text-[10px]">Saldo pending</dt>
                            <dd className="text-brand-deep-foreground mt-0.5 truncate text-sm font-bold tabular-nums">{rupiah(balance.pending)}</dd>
                        </div>
                        <div className="rounded-2xl bg-white/10 px-3 py-2.5">
                            <dt className="text-brand-deep-muted text-[10px]">Sudah dicairkan</dt>
                            <dd className="text-brand-deep-foreground mt-0.5 truncate text-sm font-bold tabular-nums">{rupiah(balance.paid_out)}</dd>
                        </div>
                    </dl>
                </div>
            }
        >
            <Head title="Pencairan" />

            {destinations.length === 0 ? (
                <EmptyState
                    icon={Landmark}
                    title="Belum ada rekening tujuan"
                    description="Tambahkan rekening atau e-wallet dulu sebelum menarik dana."
                    action={
                        <Button asChild className="h-10 rounded-xl text-sm font-semibold">
                            <Link href={route('payout.destinations')}>
                                <Plus className="size-4" />
                                Tambah rekening
                            </Link>
                        </Button>
                    }
                />
            ) : (
                <form onSubmit={submit} className="border-border bg-card rounded-2xl border p-4">
                    <h2 className="text-sm font-bold tracking-tight">Tarik dana</h2>
                    <p className="text-muted-foreground mt-0.5 text-[11px]">Pilih tujuan, isi jumlahnya, selesai.</p>

                    <ul className="mt-3.5 space-y-2">
                        {destinations.map((destination) => {
                            const active = data.payout_destination_id === destination.id;

                            return (
                                <li key={destination.id}>
                                    <button
                                        type="button"
                                        onClick={() => setData('payout_destination_id', destination.id)}
                                        aria-pressed={active}
                                        className={cn(
                                            'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                                            active ? 'border-primary bg-brand-soft' : 'border-border hover:border-primary/40',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-xl',
                                                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <Landmark className="size-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-semibold">{destination.label}</span>
                                            <span className="text-muted-foreground block truncate text-[11px]">{destination.account_holder}</span>
                                        </span>
                                        {active && (
                                            <span className="bg-primary text-primary-foreground flex size-5 shrink-0 items-center justify-center rounded-full">
                                                <Check className="size-3" strokeWidth={3} />
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <InputError message={errors.payout_destination_id} className="mt-2" />

                    <div className="border-border mt-4 border-t pt-4">
                        <Label htmlFor="amount">Jumlah pencairan</Label>
                        <RupiahInput id="amount" value={data.amount} onChange={(value) => setData('amount', value)} className="mt-1.5" />

                        <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                            <span className={cn('text-muted-foreground', belowMinimum && 'text-warning font-medium')}>
                                Minimal {rupiah(payout.min_amount)}
                            </span>
                            <button
                                type="button"
                                className="text-primary font-semibold"
                                onClick={() => setData('amount', balance.available)}
                                disabled={balance.available <= 0}
                            >
                                Tarik semua
                            </button>
                        </div>

                        {tooMuch && <p className="text-destructive mt-1.5 text-[11px] font-medium">Melebihi saldo tersedia.</p>}
                        <InputError message={errors.amount} className="mt-1.5" />
                    </div>

                    <Button
                        type="submit"
                        className="mt-4 h-11 w-full rounded-xl text-sm font-semibold"
                        disabled={processing || data.amount <= 0 || tooMuch || belowMinimum}
                    >
                        <ArrowDownToLine className="size-4" />
                        {processing ? 'Mengirim...' : 'Tarik dana'}
                    </Button>
                </form>
            )}

            {!payout.automated && (
                <p className="bg-warning-soft text-warning mt-3 flex items-start gap-2 rounded-2xl px-3.5 py-3 text-[11px] leading-relaxed">
                    <Info className="mt-0.5 size-3.5 shrink-0" />
                    Pencairan diverifikasi dan ditransfer manual oleh tim Patungan. Saldo langsung dipotong saat kamu minta, dan dikembalikan otomatis
                    kalau transfernya gagal.
                </p>
            )}

            <section className="mt-6">
                <div className="flex items-baseline justify-between">
                    <h2 className="text-base font-bold tracking-tight">Riwayat pencairan</h2>
                    <Link href={route('payout.destinations')} className="text-primary text-xs font-semibold">
                        Kelola rekening
                    </Link>
                </div>

                {settlements.length === 0 ? (
                    <p className="bg-surface text-muted-foreground mt-2.5 rounded-2xl px-4 py-3 text-xs">Belum ada pencairan.</p>
                ) : (
                    <ul className="mt-2.5 space-y-2">
                        {settlements.map((settlement) => (
                            <li key={settlement.uuid} className="border-border bg-card rounded-2xl border px-3.5 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold tabular-nums">{rupiah(settlement.net_amount)}</p>
                                        <p className="text-muted-foreground mt-0.5 truncate text-[11px]">{settlement.destination}</p>
                                        <p className="text-muted-foreground mt-0.5 text-[11px]">{formatDateTime(settlement.requested_at)}</p>
                                    </div>
                                    <StatusBadge status={settlement.status} label={settlement.status_label} />
                                </div>
                                {settlement.failure_reason && <p className="text-destructive mt-2 text-[11px]">{settlement.failure_reason}</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </PatunganLayout>
    );
}
