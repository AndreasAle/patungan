import InputError from '@/components/input-error';
import { DashboardStat } from '@/components/patungan/dashboard-stat';
import { EmptyState } from '@/components/patungan/empty-state';
import { MoneyText } from '@/components/patungan/money-text';
import { RupiahInput } from '@/components/patungan/rupiah-input';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Balance } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { Landmark } from 'lucide-react';
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

    return (
        <PatunganLayout title="Pencairan">
            <Head title="Pencairan" />

            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Pencairan</h1>
            <p className="text-muted-foreground mt-0.5 text-xs">Tarik saldo kamu ke rekening atau e-wallet.</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <DashboardStat label="Saldo tersedia" amount={balance.available} emphasis />
                <DashboardStat label="Saldo pending" amount={balance.pending} />
                <DashboardStat label="Sudah dicairkan" amount={balance.paid_out} />
            </div>

            {!payout.automated && (
                <p className="bg-warning-soft text-warning mt-4 rounded-xl px-4 py-3 text-sm">
                    Pencairan diproses manual oleh tim Patungan. Permintaan kamu masuk antrean dan diverifikasi sebelum dana dikirim.
                </p>
            )}

            <section className="mt-8">
                <div className="flex items-center justify-between">
                    <h2 className="font-bold tracking-tight">Rekening tujuan</h2>
                    <Link href={route('payout.destinations')} className="text-primary text-sm font-semibold">
                        Kelola
                    </Link>
                </div>

                {destinations.length === 0 ? (
                    <EmptyState
                        className="mt-3"
                        icon={Landmark}
                        title="Belum ada rekening tujuan."
                        description="Tambahkan rekening dulu sebelum menarik dana."
                        action={
                            <Button asChild className="h-11 rounded-xl font-semibold">
                                <Link href={route('payout.destinations')}>Tambah rekening</Link>
                            </Button>
                        }
                    />
                ) : (
                    <form onSubmit={submit} className="border-border bg-card mt-3 rounded-2xl border p-4">
                        <div className="space-y-2">
                            {destinations.map((destination) => (
                                <button
                                    key={destination.id}
                                    type="button"
                                    onClick={() => setData('payout_destination_id', destination.id)}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition',
                                        data.payout_destination_id === destination.id
                                            ? 'border-primary bg-brand-soft'
                                            : 'border-border hover:border-primary/40',
                                    )}
                                >
                                    <Landmark className="text-primary size-4" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-semibold">{destination.label}</span>
                                        <span className="text-muted-foreground block truncate text-sm">{destination.account_holder}</span>
                                    </span>
                                </button>
                            ))}
                        </div>
                        <InputError message={errors.payout_destination_id} className="mt-2" />

                        <div className="mt-4">
                            <Label htmlFor="amount">Jumlah pencairan</Label>
                            <RupiahInput id="amount" value={data.amount} onChange={(value) => setData('amount', value)} className="mt-1.5" />
                            <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-xs">
                                <span>Minimal {rupiah(payout.min_amount)}</span>
                                <button type="button" className="text-primary font-semibold" onClick={() => setData('amount', balance.available)}>
                                    Tarik semua
                                </button>
                            </div>
                            <InputError message={errors.amount} className="mt-1.5" />
                        </div>

                        <Button
                            type="submit"
                            className="mt-4 h-11 w-full rounded-xl font-semibold"
                            disabled={processing || data.amount <= 0 || data.amount > balance.available}
                        >
                            {processing ? 'Mengirim...' : 'Tarik dana'}
                        </Button>
                    </form>
                )}
            </section>

            <section className="mt-8">
                <h2 className="font-bold tracking-tight">Riwayat pencairan</h2>

                {settlements.length === 0 ? (
                    <p className="bg-muted text-muted-foreground mt-3 rounded-xl px-4 py-3 text-sm">Belum ada pencairan.</p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {settlements.map((settlement) => (
                            <li key={settlement.uuid} className="border-border bg-card rounded-2xl border px-4 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <MoneyText amount={settlement.net_amount} />
                                        <p className="text-muted-foreground mt-0.5 truncate text-sm">{settlement.destination}</p>
                                        <p className="text-muted-foreground mt-0.5 text-xs">{formatDateTime(settlement.requested_at)}</p>
                                    </div>
                                    <StatusBadge status={settlement.status} label={settlement.status_label} />
                                </div>
                                {settlement.failure_reason && <p className="text-destructive mt-2 text-sm">{settlement.failure_reason}</p>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </PatunganLayout>
    );
}
