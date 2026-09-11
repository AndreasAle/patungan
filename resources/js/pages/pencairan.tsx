import InputError from '@/components/input-error';
import { ConfirmDialog } from '@/components/patungan/confirm-dialog';
import { EmptyState } from '@/components/patungan/empty-state';
import { RupiahInput } from '@/components/patungan/rupiah-input';
import { Eyebrow, PanelHeading } from '@/components/patungan/section-heading';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Balance } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowUpRight, Check, Landmark, Lock, Plus, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Destination {
    id: number;
    type: string;
    label: string;
    account_holder: string;
    is_default: boolean;
}

interface SettlementRow {
    uuid: string;
    reference: string;
    amount: number;
    fee: number;
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

/**
 * Withdrawing money.
 *
 * This is the only screen in the product where funds leave, and it is written
 * to look like it. Three things do most of that work:
 *
 *  - Nothing moves without a review step. The old version submitted straight
 *    from the form, which is both a usability risk and the single strongest
 *    signal that a money screen is not serious.
 *  - Figures are presented as a statement - amount, fee, net received - rather
 *    than as one number and a friendly sentence. A person about to move money
 *    wants to see the arithmetic, not be reassured.
 *  - Every request carries a reference somebody can quote to support.
 *
 * The restraint is deliberate. Rounded pills and casual copy read as a
 * consumer app; on a withdrawal screen they read as an app pretending to be
 * one.
 */
export default function Pencairan({ balance, destinations, settlements, payout }: PencairanProps) {
    const { data, setData, post, processing, errors, reset } = useForm({
        payout_destination_id: destinations.find((destination) => destination.is_default)?.id ?? destinations[0]?.id ?? 0,
        amount: 0,
    });

    const [reviewing, setReviewing] = useState(false);

    const tooMuch = data.amount > balance.available;
    const belowMinimum = data.amount > 0 && data.amount < payout.min_amount;
    const ready = data.amount > 0 && !tooMuch && !belowMinimum && data.payout_destination_id > 0;

    const selected = destinations.find((destination) => destination.id === data.payout_destination_id);

    // The form opens the review; only the review submits.
    const review = (event: FormEvent) => {
        event.preventDefault();

        if (ready) setReviewing(true);
    };

    const confirm = () => {
        post(route('payout.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('amount');
                setReviewing(false);
            },
        });
    };

    return (
        <PatunganLayout
            wide
            title="Pencairan"
            hero={
                <div>
                    <Eyebrow onDeep>Saldo tersedia</Eyebrow>

                    <p className="display text-brand-deep-foreground mt-3 text-[29px] tabular-nums sm:text-[40px] lg:text-[44px]">
                        {rupiah(balance.available)}
                    </p>

                    <dl className="divide-brand-deep-muted/25 border-brand-deep-muted/25 mt-5 flex divide-x border-t pt-4">
                        {[
                            ['Saldo pending', balance.pending],
                            ['Sudah dicairkan', balance.paid_out],
                        ].map(([label, amount], index) => (
                            <div key={label as string} className={index === 0 ? 'pr-6' : 'pl-6'}>
                                <dt className="text-brand-deep-muted text-[10px] font-semibold tracking-[0.14em] uppercase">{label}</dt>
                                <dd className="text-brand-deep-foreground mt-1 text-sm font-bold tabular-nums">{rupiah(amount as number)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            }
        >
            <Head title="Pencairan" />

            <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
                <div className="min-w-0">
                    {destinations.length === 0 ? (
                        <EmptyState
                            icon={Landmark}
                            title="Belum ada rekening tujuan"
                            description="Tambahkan rekening atau e-wallet dulu sebelum menarik dana."
                            action={
                                <Button asChild className="h-11 rounded-full px-6 text-sm font-semibold">
                                    <Link href={route('payout.destinations')}>
                                        <Plus className="size-4" />
                                        Tambah rekening
                                    </Link>
                                </Button>
                            }
                        />
                    ) : (
                        <form onSubmit={review} className="border-border bg-card overflow-hidden rounded-2xl border">
                            <div className="border-border border-b px-5 py-4">
                                <PanelHeading>Penarikan dana</PanelHeading>
                                <p className="text-muted-foreground mt-1.5 text-xs">Dana dikirim ke rekening atas nama kamu sendiri.</p>
                            </div>

                            <fieldset className="px-5 py-5">
                                <legend className="text-muted-foreground text-[11px] font-semibold tracking-[0.1em] uppercase">
                                    Rekening tujuan
                                </legend>

                                <ul className="mt-3 space-y-2">
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
                                                            'flex size-9 shrink-0 items-center justify-center rounded-lg',
                                                            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                                                        )}
                                                    >
                                                        <Landmark className="size-4" />
                                                    </span>
                                                    <span className="min-w-0 flex-1">
                                                        {/* Monospace: an account number is read
                                                            digit by digit, not as a word. */}
                                                        <span className="block truncate font-mono text-sm font-semibold tracking-tight">
                                                            {destination.label}
                                                        </span>
                                                        <span className="text-muted-foreground block truncate text-[11px]">
                                                            {destination.account_holder}
                                                        </span>
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
                            </fieldset>

                            <div className="border-border border-t px-5 py-5">
                                <Label htmlFor="amount" className="text-muted-foreground text-[11px] font-semibold tracking-[0.1em] uppercase">
                                    Jumlah penarikan
                                </Label>
                                <RupiahInput id="amount" value={data.amount} onChange={(value) => setData('amount', value)} className="mt-2" />

                                <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                                    <span className={cn('text-muted-foreground', belowMinimum && 'text-warning font-medium')}>
                                        Minimum {rupiah(payout.min_amount)}
                                    </span>
                                    <button
                                        type="button"
                                        className="text-primary font-semibold disabled:opacity-40"
                                        onClick={() => setData('amount', balance.available)}
                                        disabled={balance.available <= 0}
                                    >
                                        Tarik seluruh saldo
                                    </button>
                                </div>

                                {tooMuch && <p className="text-destructive mt-2 text-[11px] font-medium">Melebihi saldo tersedia.</p>}
                                <InputError message={errors.amount} className="mt-2" />
                            </div>

                            <div className="border-border bg-surface border-t px-5 py-4">
                                <Button type="submit" className="h-12 w-full rounded-xl text-sm font-semibold" disabled={processing || !ready}>
                                    <Lock className="size-4" />
                                    Lanjut ke konfirmasi
                                </Button>

                                <p className="text-muted-foreground mt-3 flex items-start gap-2 text-[11px] leading-relaxed">
                                    <ShieldCheck className="text-primary mt-px size-3.5 shrink-0" />
                                    Kamu akan melihat rincian lengkap sebelum dana benar-benar ditarik.
                                </p>
                            </div>
                        </form>
                    )}

                    {/*
                        Stated plainly and without a warning colour. This is how
                        the product works, not a problem - and dressing a normal
                        operating fact as an alert teaches people to ignore
                        alerts.
                    */}
                    <div className="border-border bg-card mt-4 rounded-2xl border px-5 py-4">
                        <p className="text-[11px] font-bold tracking-[0.1em] uppercase">Cara pencairan diproses</p>
                        <dl className="divide-border mt-3 divide-y text-[11px]">
                            {[
                                ['Metode', payout.automated ? 'Otomatis lewat penyedia' : 'Diverifikasi dan ditransfer manual'],
                                ['Saldo dipotong', 'Saat permintaan dibuat'],
                                ['Kalau transfer gagal', 'Saldo dikembalikan otomatis'],
                                ['Rekening tujuan', 'Harus atas nama kamu sendiri'],
                            ].map(([term, detail]) => (
                                <div key={term} className="flex items-start justify-between gap-4 py-2">
                                    <dt className="text-muted-foreground shrink-0">{term}</dt>
                                    <dd className="text-right font-medium">{detail}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>

                <section className="border-border bg-card min-w-0 overflow-hidden rounded-2xl border">
                    <div className="border-border flex items-center justify-between gap-3 border-b px-5 py-4">
                        <PanelHeading>Riwayat penarikan</PanelHeading>
                        <Link
                            href={route('payout.destinations')}
                            className="text-primary group inline-flex shrink-0 items-center gap-1 text-xs font-semibold"
                        >
                            Kelola rekening
                            <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </Link>
                    </div>

                    {settlements.length === 0 ? (
                        <p className="text-muted-foreground px-5 py-8 text-center text-xs">Belum ada penarikan.</p>
                    ) : (
                        <ul className="divide-border divide-y">
                            {settlements.map((settlement) => (
                                <li key={settlement.uuid} className="px-5 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-muted-foreground font-mono text-[10px] tracking-wider">{settlement.reference}</p>
                                            <p className="display text-foreground mt-1 text-base tabular-nums">{rupiah(settlement.net_amount)}</p>
                                            <p className="text-muted-foreground mt-1 truncate font-mono text-[11px]">{settlement.destination}</p>
                                        </div>
                                        <StatusBadge status={settlement.status} label={settlement.status_label} />
                                    </div>

                                    <dl className="text-muted-foreground mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                                        <div className="flex justify-between gap-2">
                                            <dt>Diminta</dt>
                                            <dd className="tabular-nums">{formatDateTime(settlement.requested_at)}</dd>
                                        </div>
                                        {settlement.processed_at && (
                                            <div className="flex justify-between gap-2">
                                                <dt>Diproses</dt>
                                                <dd className="tabular-nums">{formatDateTime(settlement.processed_at)}</dd>
                                            </div>
                                        )}
                                    </dl>

                                    {settlement.failure_reason && (
                                        <p className="bg-destructive/10 text-destructive mt-2.5 rounded-lg px-3 py-2 text-[11px]">
                                            {settlement.failure_reason}
                                        </p>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            {/*
                The review. Everything a person needs to check is here, in the
                order they would check it: where it goes, whose name is on it,
                how much leaves, how much arrives.
            */}
            <ConfirmDialog
                open={reviewing}
                onOpenChange={setReviewing}
                title="Konfirmasi penarikan"
                description="Periksa rinciannya. Saldo dipotong begitu kamu konfirmasi."
                confirmLabel={processing ? 'Memproses...' : 'Konfirmasi penarikan'}
                cancelLabel="Batal"
                processing={processing}
                onConfirm={confirm}
            >
                <dl className="divide-border border-border divide-y rounded-xl border text-sm">
                    <div className="flex items-start justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground text-xs">Rekening tujuan</dt>
                        <dd className="text-right">
                            <span className="block font-mono text-sm font-semibold">{selected?.label}</span>
                            <span className="text-muted-foreground block text-[11px]">{selected?.account_holder}</span>
                        </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground text-xs">Jumlah ditarik</dt>
                        <dd className="font-semibold tabular-nums">{rupiah(data.amount)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="text-xs font-semibold">Diterima di rekening</dt>
                        <dd className="display text-base tabular-nums">{rupiah(data.amount)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <dt className="text-muted-foreground text-xs">Sisa saldo</dt>
                        <dd className="tabular-nums">{rupiah(Math.max(balance.available - data.amount, 0))}</dd>
                    </div>
                </dl>
            </ConfirmDialog>
        </PatunganLayout>
    );
}
