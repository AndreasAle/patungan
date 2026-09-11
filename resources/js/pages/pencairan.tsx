import InputError from '@/components/input-error';
import { BankLogo } from '@/components/patungan/bank-logo';
import { ConfirmDialog } from '@/components/patungan/confirm-dialog';
import { RupiahInput } from '@/components/patungan/rupiah-input';
import { Eyebrow, PanelHeading } from '@/components/patungan/section-heading';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Balance } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowUpRight, BadgeCheck, ChevronRight, LoaderCircle, Lock, ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Channel {
    code: string;
    label: string;
}

interface Destination {
    id: number;
    type: string;
    provider_code: string;
    provider_label: string;
    masked_number: string;
    label: string;
    account_holder: string;
    verification_status: string;
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

interface CheckResult {
    status: 'VERIFIED' | 'MISMATCH' | 'UNVERIFIED' | 'UNAVAILABLE';
    account_holder: string | null;
    found: boolean;
    message: string;
}

interface PencairanProps {
    balance: Balance;
    destinations: Destination[];
    settlements: SettlementRow[];
    channels: Record<string, Channel[]>;
    inquiry_available: boolean;
    payout: { min_amount: number; provider: string; automated: boolean };
}

type Step = 'pick' | 'account' | 'amount';

/**
 * Withdrawing money, one decision per screen.
 *
 * The previous version put destination, amount and submit on a single form and
 * moved money the moment the button was pressed. This follows the shape people
 * already know from their wallet app instead: choose where, say how much,
 * review, confirm. Each step asks one thing and shows the answer to the last
 * one, so at no point is somebody holding four decisions in their head while
 * looking at their own balance.
 *
 * Adding a new bank is part of the same path rather than a separate admin
 * screen. Nobody thinks "I will go and register a bank account"; they think "I
 * want my money in BCA".
 */
export default function Pencairan({ balance, destinations, settlements, channels, inquiry_available, payout }: PencairanProps) {
    const [step, setStep] = useState<Step>('pick');
    const [target, setTarget] = useState<Destination | null>(null);

    // Adding a bank, before it becomes a destination.
    const [newChannel, setNewChannel] = useState<Channel | null>(null);
    const [accountNumber, setAccountNumber] = useState('');
    const [accountHolder, setAccountHolder] = useState('');
    const [check, setCheck] = useState<CheckResult | null>(null);
    const [checking, setChecking] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        payout_destination_id: 0,
        amount: 0,
    });

    const [reviewing, setReviewing] = useState(false);

    const tooMuch = data.amount > balance.available;
    const belowMinimum = data.amount > 0 && data.amount < payout.min_amount;
    const readyToReview = data.amount > 0 && !tooMuch && !belowMinimum && data.payout_destination_id > 0;

    const chooseExisting = (destination: Destination) => {
        setTarget(destination);
        setData('payout_destination_id', destination.id);
        setStep('amount');
    };

    const chooseBank = (channel: Channel) => {
        setNewChannel(channel);
        setAccountNumber('');
        setAccountHolder('');
        setCheck(null);
        setSaveError(null);
        setStep('account');
    };

    const backToPick = () => {
        setStep('pick');
        setTarget(null);
        setNewChannel(null);
        reset('amount');
    };

    const runCheck = async () => {
        if (!newChannel) return;

        setChecking(true);

        try {
            const csrf = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1];

            const response = await fetch(route('payout.destination.verify'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(csrf ? { 'X-XSRF-TOKEN': decodeURIComponent(csrf) } : {}),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ type: 'BANK', provider_code: newChannel.code, account_number: accountNumber }),
            });

            setCheck(
                response.ok
                    ? await response.json()
                    : { status: 'UNAVAILABLE', account_holder: null, found: false, message: 'Verifikasi gagal. Coba lagi sebentar lagi.' },
            );
        } catch {
            setCheck({ status: 'UNAVAILABLE', account_holder: null, found: false, message: 'Koneksi terputus saat verifikasi.' });
        } finally {
            setChecking(false);
        }
    };

    /**
     * Saves the account, then steps forward onto it.
     *
     * The destination is created through the same endpoint the management
     * screen uses, so verification and storage rules live in exactly one place.
     * The page reloads its destinations and the newest one becomes the target.
     */
    const saveAccount = () => {
        if (!newChannel) return;

        setSaving(true);
        setSaveError(null);

        router.post(
            route('payout.destination.store'),
            { type: 'BANK', provider_code: newChannel.code, account_number: accountNumber, account_holder: check?.account_holder ?? accountHolder },
            {
                preserveScroll: true,
                onSuccess: (page) => {
                    const list = (page.props as unknown as PencairanProps).destinations ?? [];
                    const added = list.find((item) => item.provider_code === newChannel.code) ?? list[0];

                    if (added) {
                        setTarget(added);
                        setData('payout_destination_id', added.id);
                        setStep('amount');
                    }
                },
                onError: () => setSaveError('Rekening belum bisa disimpan. Cek lagi nomornya.'),
                onFinish: () => setSaving(false),
            },
        );
    };

    const review = (event: FormEvent) => {
        event.preventDefault();

        if (readyToReview) setReviewing(true);
    };

    const confirm = () => {
        post(route('payout.store'), {
            preserveScroll: true,
            onSuccess: () => {
                reset('amount');
                setReviewing(false);
                backToPick();
            },
        });
    };

    const canContinue = inquiry_available
        ? check !== null && check.status !== 'UNVERIFIED'
        : accountNumber.length >= 6 && accountHolder.trim().length > 0;

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
                    {step === 'pick' && (
                        <StepPick destinations={destinations} banks={channels.BANK ?? []} onPick={chooseExisting} onNewBank={chooseBank} />
                    )}

                    {step === 'account' && newChannel && (
                        <StepAccount
                            channel={newChannel}
                            accountNumber={accountNumber}
                            setAccountNumber={setAccountNumber}
                            accountHolder={accountHolder}
                            setAccountHolder={setAccountHolder}
                            inquiryAvailable={inquiry_available}
                            check={check}
                            checking={checking}
                            onCheck={runCheck}
                            onClearCheck={() => setCheck(null)}
                            canContinue={canContinue}
                            saving={saving}
                            error={saveError}
                            onBack={backToPick}
                            onContinue={saveAccount}
                        />
                    )}

                    {step === 'amount' && target && (
                        <StepAmount
                            destination={target}
                            available={balance.available}
                            minimum={payout.min_amount}
                            amount={data.amount}
                            setAmount={(value) => setData('amount', value)}
                            tooMuch={tooMuch}
                            belowMinimum={belowMinimum}
                            ready={readyToReview}
                            error={errors.amount}
                            onBack={backToPick}
                            onSubmit={review}
                        />
                    )}

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
                            <span className="block font-mono text-sm font-semibold">{target?.label}</span>
                            <span className="text-muted-foreground block text-[11px]">{target?.account_holder}</span>
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

/** Step one: where is the money going. */
function StepPick({
    destinations,
    banks,
    onPick,
    onNewBank,
}: {
    destinations: Destination[];
    banks: Channel[];
    onPick: (destination: Destination) => void;
    onNewBank: (channel: Channel) => void;
}) {
    return (
        <div className="border-border bg-card overflow-hidden rounded-2xl border">
            <div className="border-border border-b px-5 py-4">
                <PanelHeading>Tarik dana</PanelHeading>
                <p className="text-muted-foreground mt-1.5 text-xs">Pilih tujuan, atau tambah rekening baru.</p>
            </div>

            {destinations.length > 0 && (
                <ul className="divide-border divide-y">
                    {destinations.map((destination) => (
                        <li key={destination.id}>
                            <button
                                type="button"
                                onClick={() => onPick(destination)}
                                className="hover:bg-surface flex w-full items-center gap-3 px-5 py-3.5 text-left transition"
                            >
                                <BankLogo code={destination.provider_code} label={destination.provider_label} />

                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="truncate text-sm font-bold tracking-tight">{destination.provider_label}</span>
                                        {destination.verification_status === 'VERIFIED' && <BadgeCheck className="text-success size-3.5 shrink-0" />}
                                    </span>
                                    <span className="text-muted-foreground block truncate font-mono text-[11px]">{destination.masked_number}</span>
                                    <span className="text-muted-foreground block truncate text-[11px]">{destination.account_holder}</span>
                                </span>

                                <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="border-border border-t px-5 py-5">
                <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.1em] uppercase">
                    {destinations.length > 0 ? 'Tarik ke rekening lain' : 'Pilih bank tujuan'}
                </p>

                <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
                    {banks.map((bank) => (
                        <button
                            key={bank.code}
                            type="button"
                            onClick={() => onNewBank(bank)}
                            className="border-border hover:border-primary/50 hover:bg-surface flex flex-col items-center gap-2 rounded-xl border p-2.5 transition active:scale-[0.98]"
                        >
                            <BankLogo code={bank.code} label={bank.label} size="sm" />
                            <span className="w-full truncate text-center text-[10px] font-semibold">{bank.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Step two: whose account is it. */
function StepAccount({
    channel,
    accountNumber,
    setAccountNumber,
    accountHolder,
    setAccountHolder,
    inquiryAvailable,
    check,
    checking,
    onCheck,
    onClearCheck,
    canContinue,
    saving,
    error,
    onBack,
    onContinue,
}: {
    channel: Channel;
    accountNumber: string;
    setAccountNumber: (value: string) => void;
    accountHolder: string;
    setAccountHolder: (value: string) => void;
    inquiryAvailable: boolean;
    check: CheckResult | null;
    checking: boolean;
    onCheck: () => void;
    onClearCheck: () => void;
    canContinue: boolean;
    saving: boolean;
    error: string | null;
    onBack: () => void;
    onContinue: () => void;
}) {
    return (
        <div className="border-border bg-card overflow-hidden rounded-2xl border">
            <div className="border-border flex items-center gap-3 border-b px-5 py-4">
                <button type="button" onClick={onBack} aria-label="Kembali" className="text-muted-foreground hover:text-foreground -ml-1 p-1">
                    <ArrowLeft className="size-4" />
                </button>
                <PanelHeading>Tambahkan rekening</PanelHeading>
            </div>

            <div className="border-border flex items-center gap-3 border-b px-5 py-4">
                <BankLogo code={channel.code} label={channel.label} size="lg" />
                <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight">{channel.label}</p>
                    <p className="text-muted-foreground text-[11px]">Rekening atas nama kamu sendiri</p>
                </div>
            </div>

            <div className="px-5 py-5">
                <Label htmlFor="account_number" className="text-muted-foreground text-[11px] font-semibold tracking-[0.1em] uppercase">
                    Nomor rekening
                </Label>
                <Input
                    id="account_number"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="Ketik nomor rekening"
                    value={accountNumber}
                    onChange={(event) => {
                        setAccountNumber(event.target.value.replace(/\D/g, ''));
                        onClearCheck();
                    }}
                    className="mt-2 h-12 rounded-xl font-mono text-base tracking-wider tabular-nums"
                />

                {inquiryAvailable ? (
                    <div className="mt-4">
                        {check === null ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onCheck}
                                disabled={checking || accountNumber.length < 6}
                                className="h-12 w-full rounded-xl text-sm font-semibold"
                            >
                                {checking && <LoaderCircle className="size-4 animate-spin" />}
                                {checking ? 'Mengecek ke bank...' : 'Verifikasi'}
                            </Button>
                        ) : (
                            <div
                                className={cn(
                                    'rounded-xl border px-4 py-3.5',
                                    check.status === 'VERIFIED' && 'border-success/30 bg-success-soft',
                                    check.status === 'MISMATCH' && 'border-warning/40 bg-warning-soft',
                                    (check.status === 'UNVERIFIED' || check.status === 'UNAVAILABLE') && 'border-border bg-surface',
                                )}
                            >
                                <p className="text-muted-foreground text-[10px] font-bold tracking-[0.14em] uppercase">Rekening tujuan</p>

                                {check.account_holder ? (
                                    <p className="mt-1.5 flex items-center gap-1.5 text-sm font-bold tracking-tight">
                                        {check.account_holder}
                                        {check.status === 'VERIFIED' && <BadgeCheck className="text-success size-4 shrink-0" />}
                                    </p>
                                ) : (
                                    <p className="text-muted-foreground mt-1.5 text-sm font-semibold">Tidak diketahui</p>
                                )}

                                <p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed">{check.message}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="mt-4">
                        <Label htmlFor="account_holder" className="text-muted-foreground text-[11px] font-semibold tracking-[0.1em] uppercase">
                            Nama pemilik
                        </Label>
                        <Input
                            id="account_holder"
                            placeholder="Sesuai buku tabungan"
                            value={accountHolder}
                            onChange={(event) => setAccountHolder(event.target.value)}
                            className="mt-2 h-12 rounded-xl"
                        />
                    </div>
                )}

                {error && <InputError message={error} className="mt-3" />}
            </div>

            <div className="border-border bg-surface border-t px-5 py-4">
                <Button onClick={onContinue} disabled={saving || !canContinue} className="h-12 w-full rounded-xl text-sm font-semibold">
                    {saving && <LoaderCircle className="size-4 animate-spin" />}
                    {saving ? 'Menyimpan...' : 'Lanjut'}
                </Button>
            </div>
        </div>
    );
}

/** Step three: how much. */
function StepAmount({
    destination,
    available,
    minimum,
    amount,
    setAmount,
    tooMuch,
    belowMinimum,
    ready,
    error,
    onBack,
    onSubmit,
}: {
    destination: Destination;
    available: number;
    minimum: number;
    amount: number;
    setAmount: (value: number) => void;
    tooMuch: boolean;
    belowMinimum: boolean;
    ready: boolean;
    error?: string;
    onBack: () => void;
    onSubmit: (event: FormEvent) => void;
}) {
    // Round figures people actually withdraw, filtered to what they can afford.
    const presets = [50_000, 100_000, 250_000, 500_000].filter((value) => value <= available && value >= minimum);

    return (
        <form onSubmit={onSubmit} className="border-border bg-card overflow-hidden rounded-2xl border">
            <div className="border-border flex items-center gap-3 border-b px-5 py-4">
                <button type="button" onClick={onBack} aria-label="Kembali" className="text-muted-foreground hover:text-foreground -ml-1 p-1">
                    <ArrowLeft className="size-4" />
                </button>
                <PanelHeading>Jumlah penarikan</PanelHeading>
            </div>

            {/* The destination stays on screen. Typing an amount without being
                able to see where it is going is how the wrong account gets
                paid. */}
            <div className="border-border flex items-center gap-3 border-b px-5 py-3.5">
                <BankLogo code={destination.provider_code} label={destination.provider_label} size="sm" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold tracking-tight">{destination.account_holder}</p>
                    <p className="text-muted-foreground truncate font-mono text-[11px]">
                        {destination.provider_label} {destination.masked_number}
                    </p>
                </div>
                <button type="button" onClick={onBack} className="text-primary shrink-0 text-[11px] font-semibold">
                    Ganti
                </button>
            </div>

            <div className="px-5 py-5">
                <RupiahInput id="amount" value={amount} onChange={setAmount} className="h-14 text-lg" />

                <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
                    <span className={cn('text-muted-foreground', belowMinimum && 'text-warning font-medium')}>Minimum {rupiah(minimum)}</span>
                    <span className="text-muted-foreground">Tersedia {rupiah(available)}</span>
                </div>

                {presets.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {presets.map((value) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => setAmount(value)}
                                className="border-border hover:border-primary/50 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tabular-nums transition"
                            >
                                {rupiah(value)}
                            </button>
                        ))}
                        <button
                            type="button"
                            onClick={() => setAmount(available)}
                            className="border-primary/40 text-primary hover:bg-brand-soft rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition"
                        >
                            Semua
                        </button>
                    </div>
                )}

                {tooMuch && <p className="text-destructive mt-3 text-[11px] font-medium">Melebihi saldo tersedia.</p>}
                <InputError message={error} className="mt-3" />
            </div>

            <div className="border-border bg-surface border-t px-5 py-4">
                <Button type="submit" className="h-12 w-full rounded-xl text-sm font-semibold" disabled={!ready}>
                    <Lock className="size-4" />
                    Lanjut ke konfirmasi
                </Button>

                <p className="text-muted-foreground mt-3 flex items-start gap-2 text-[11px] leading-relaxed">
                    <ShieldCheck className="text-primary mt-px size-3.5 shrink-0" />
                    Kamu akan melihat rincian lengkap sebelum dana benar-benar ditarik.
                </p>
            </div>
        </form>
    );
}
