import InputError from '@/components/input-error';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { DeadlinePicker } from '@/components/patungan/deadline-picker';
import { PasteNamesSheet } from '@/components/patungan/paste-names-sheet';
import { RupiahInput } from '@/components/patungan/rupiah-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PatunganLayout from '@/layouts/patungan-layout';
import { rupiah } from '@/lib/format';
import { parseQuickNames, type ParsedName } from '@/lib/parse-names';
import { cn } from '@/lib/utils';
import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, ClipboardPaste, Plus, Users, X } from 'lucide-react';
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react';

interface Category {
    value: string;
    label: string;
}

interface ParticipantDraft {
    name: string;
    amount: number | null;
    note: string | null;
    [key: string]: string | number | null;
}

interface CreateForm {
    title: string;
    description: string;
    category: string;
    event_date: string;
    expires_at: string;
    split_type: 'EQUAL' | 'CUSTOM';
    equal_amount: number;
    participants: ParticipantDraft[];
    [key: string]: string | number | ParticipantDraft[];
}

const steps = [
    { label: 'Detail', hint: 'Patungan buat apa?' },
    { label: 'Pembagian', hint: 'Siapa bayar berapa?' },
    { label: 'Peserta', hint: 'Siapa aja yang ikut?' },
    { label: 'Review', hint: 'Cek lagi sebelum jadi.' },
];

/** Card shell used for every block in the wizard, so the rhythm stays even. */
function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <section className="border-border bg-card rounded-2xl border p-4">
            <h2 className="text-sm font-bold tracking-tight">{title}</h2>
            {description && <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>}
            <div className="mt-3.5">{children}</div>
        </section>
    );
}

export default function CreatePatungan({ categories, fee_bearer }: { categories: Category[]; fee_bearer: string }) {
    const [step, setStep] = useState(0);
    const [nameInput, setNameInput] = useState('');
    const [pasting, setPasting] = useState(false);
    const [pastedText, setPastedText] = useState('');

    const { data, setData, post, processing, errors } = useForm<CreateForm>({
        title: '',
        description: '',
        category: 'OLAHRAGA',
        event_date: '',
        expires_at: '',
        split_type: 'EQUAL',
        equal_amount: 0,
        participants: [],
    });

    const target = useMemo(() => {
        if (data.split_type === 'EQUAL') {
            return data.equal_amount * data.participants.length;
        }

        return data.participants.reduce((sum, participant) => sum + (participant.amount ?? 0), 0);
    }, [data.split_type, data.equal_amount, data.participants]);

    const appendNames = (entries: ParsedName[]) => {
        if (entries.length === 0) return;

        setData('participants', [
            ...data.participants,
            ...entries.map((entry) => ({
                name: entry.name,
                amount: data.split_type === 'CUSTOM' ? data.equal_amount || 0 : null,
                note: entry.note,
            })),
        ]);
    };

    /** Accepts one name, or a short comma separated list, from the quick field. */
    const addNames = (raw: string) => {
        appendNames(parseQuickNames(raw));
        setNameInput('');
    };

    const onNameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addNames(nameInput);
        }
    };

    const updateParticipant = (index: number, patch: { name?: string; amount?: number }) => {
        setData(
            'participants',
            data.participants.map((participant, i) => (i === index ? { ...participant, ...patch } : participant)),
        );
    };

    const removeParticipant = (index: number) => {
        setData(
            'participants',
            data.participants.filter((_, i) => i !== index),
        );
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(route('patungan.store'));
    };

    const canContinue =
        (step === 0 && data.title.trim().length > 0) ||
        (step === 1 && (data.split_type === 'CUSTOM' || data.equal_amount > 0)) ||
        (step === 2 && data.participants.length > 0);

    return (
        <PatunganLayout
            hero={
                <div>
                    <p className="text-brand-deep-muted text-[11px]">
                        Langkah {step + 1} dari {steps.length}
                    </p>
                    <h1 className="text-brand-deep-foreground mt-0.5 text-lg font-bold tracking-tight sm:text-xl">{steps[step].label}</h1>
                    <p className="text-brand-deep-muted mt-0.5 text-xs">{steps[step].hint}</p>

                    <ol className="mt-4 flex gap-1.5" aria-label="Progres pembuatan patungan">
                        {steps.map((entry, index) => (
                            <li
                                key={entry.label}
                                aria-current={index === step ? 'step' : undefined}
                                className={cn('h-1 flex-1 rounded-full transition', index <= step ? 'bg-lime' : 'bg-white/20')}
                            />
                        ))}
                    </ol>
                </div>
            }
        >
            <Head title="Buat Patungan" />

            <form onSubmit={submit}>
                {step === 0 && (
                    <div className="space-y-3">
                        <Section title="Judul patungan" description="Nama yang muncul di link yang kamu share.">
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(event) => setData('title', event.target.value)}
                                placeholder="Badminton Minggu Malam"
                                className="h-11 rounded-xl"
                                autoFocus
                            />
                            <InputError message={errors.title} className="mt-1.5" />

                            <Label htmlFor="description" className="mt-3.5 block text-xs">
                                Deskripsi (opsional)
                            </Label>
                            <Input
                                id="description"
                                value={data.description}
                                onChange={(event) => setData('description', event.target.value)}
                                placeholder="Sewa lapangan 2 jam + shuttlecock"
                                className="mt-1.5 h-11 rounded-xl"
                            />
                            <InputError message={errors.description} className="mt-1.5" />
                        </Section>

                        <Section title="Kategori">
                            <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">
                                {categories.map((category) => {
                                    const active = data.category === category.value;

                                    return (
                                        <button
                                            key={category.value}
                                            type="button"
                                            onClick={() => setData('category', category.value)}
                                            aria-pressed={active}
                                            className={cn(
                                                'flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2.5 transition',
                                                active ? 'border-primary bg-brand-soft' : 'border-border hover:border-primary/40',
                                            )}
                                        >
                                            <CategoryIcon
                                                category={category.value}
                                                size="sm"
                                                className={active ? '' : 'bg-muted text-muted-foreground'}
                                            />
                                            <span
                                                className={cn(
                                                    'text-center text-[10px] leading-tight font-semibold',
                                                    active ? 'text-primary' : 'text-muted-foreground',
                                                )}
                                            >
                                                {category.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                            <InputError message={errors.category} className="mt-1.5" />
                        </Section>

                        <Section title="Waktu" description="Dua-duanya opsional.">
                            <Label htmlFor="event_date" className="text-xs">
                                Tanggal kegiatan
                            </Label>
                            <Input
                                id="event_date"
                                type="date"
                                value={data.event_date}
                                onChange={(event) => setData('event_date', event.target.value)}
                                className="mt-1.5 h-11 rounded-xl"
                            />
                            <InputError message={errors.event_date} className="mt-1.5" />

                            <div className="mt-4">
                                <DeadlinePicker value={data.expires_at} onChange={(value) => setData('expires_at', value)} />
                                <InputError message={errors.expires_at} className="mt-1.5" />
                            </div>
                        </Section>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-3">
                        <Section title="Jenis pembagian">
                            <div className="grid gap-2 sm:grid-cols-2">
                                {(
                                    [
                                        { value: 'EQUAL', title: 'Sama rata', body: 'Semua orang bayar nominal yang sama.' },
                                        { value: 'CUSTOM', title: 'Nominal berbeda', body: 'Atur nominal tiap orang sendiri-sendiri.' },
                                    ] as const
                                ).map((option) => {
                                    const active = data.split_type === option.value;

                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setData('split_type', option.value)}
                                            aria-pressed={active}
                                            className={cn(
                                                'rounded-xl border p-3.5 text-left transition',
                                                active ? 'border-primary bg-brand-soft' : 'border-border hover:border-primary/40',
                                            )}
                                        >
                                            <p className={cn('text-sm font-semibold', active && 'text-primary')}>{option.title}</p>
                                            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{option.body}</p>
                                        </button>
                                    );
                                })}
                            </div>
                        </Section>

                        {data.split_type === 'EQUAL' ? (
                            <Section title="Nominal per orang" description="Ini yang ditagih ke tiap peserta.">
                                <RupiahInput
                                    id="equal_amount"
                                    value={data.equal_amount}
                                    onChange={(value) => setData('equal_amount', value)}
                                    placeholder="25.000"
                                />
                                <InputError message={errors.equal_amount} className="mt-1.5" />

                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    {[10000, 20000, 25000, 50000].map((preset) => (
                                        <button
                                            key={preset}
                                            type="button"
                                            onClick={() => setData('equal_amount', preset)}
                                            className="border-border text-muted-foreground hover:border-primary/40 hover:text-foreground rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                                        >
                                            {rupiah(preset)}
                                        </button>
                                    ))}
                                </div>
                            </Section>
                        ) : (
                            <p className="bg-surface text-muted-foreground rounded-xl px-4 py-3 text-xs leading-relaxed">
                                Nominal tiap peserta diisi di langkah berikutnya.
                            </p>
                        )}

                        {fee_bearer === 'payer' && (
                            <p className="bg-warning-soft text-warning rounded-xl px-4 py-3 text-xs leading-relaxed">
                                Biaya layanan ditambahkan ke tagihan peserta saat mereka bayar.
                            </p>
                        )}
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-3">
                        <Section title="Tambah peserta" description="Ketik satu-satu, atau tempel langsung daftar dari grup.">
                            <div className="flex gap-2">
                                <Input
                                    id="participant-name"
                                    value={nameInput}
                                    onChange={(event) => setNameInput(event.target.value)}
                                    onKeyDown={onNameKeyDown}
                                    onPaste={(event) => {
                                        const pasted = event.clipboardData.getData('text');
                                        if (/[\n,]/.test(pasted)) {
                                            event.preventDefault();
                                            setPastedText(pasted);
                                            setPasting(true);
                                        }
                                    }}
                                    placeholder="Ketik nama lalu Enter"
                                    className="h-11 rounded-xl"
                                    autoFocus
                                />
                                <Button type="button" onClick={() => addNames(nameInput)} className="h-11 rounded-xl px-4">
                                    <Plus className="size-4" />
                                </Button>
                            </div>

                            <button
                                type="button"
                                onClick={() => setPasting(true)}
                                className="border-primary/30 bg-brand-soft text-primary mt-2.5 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold"
                            >
                                <ClipboardPaste className="size-3.5" />
                                Tempel daftar dari chat
                            </button>
                            <p className="text-muted-foreground mt-1.5 text-[11px] leading-relaxed">
                                Nomor urut, judul tim, dan jam otomatis dibuang. Kamu bisa cek dulu sebelum ditambahkan.
                            </p>
                            <InputError message={errors.participants} className="mt-1.5" />
                        </Section>

                        <Section title={`Daftar peserta${data.participants.length > 0 ? ` (${data.participants.length})` : ''}`}>
                            {data.participants.length === 0 ? (
                                <div className="border-border flex flex-col items-center rounded-xl border border-dashed px-4 py-7 text-center">
                                    <Users className="text-muted-foreground size-4" />
                                    <p className="mt-2 text-xs font-semibold">Belum ada peserta</p>
                                    <p className="text-muted-foreground mt-0.5 text-[11px]">Tambahkan minimal satu orang.</p>
                                </div>
                            ) : (
                                <ul className="space-y-1.5">
                                    {data.participants.map((participant, index) => (
                                        <li key={index} className="border-border flex items-center gap-2 rounded-xl border p-2">
                                            <span className="bg-brand-soft text-primary flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold">
                                                {index + 1}
                                            </span>

                                            <div className="min-w-0 flex-1">
                                                <Input
                                                    value={participant.name}
                                                    onChange={(event) => updateParticipant(index, { name: event.target.value })}
                                                    aria-label={`Nama peserta ${index + 1}`}
                                                    className="focus-visible:border-input h-9 rounded-lg border-transparent bg-transparent px-1.5 text-sm font-medium shadow-none"
                                                />
                                                {participant.note && (
                                                    <p className="text-muted-foreground truncate px-1.5 text-[11px]">{participant.note}</p>
                                                )}
                                            </div>

                                            {data.split_type === 'CUSTOM' ? (
                                                <RupiahInput
                                                    value={participant.amount ?? 0}
                                                    onChange={(value) => updateParticipant(index, { amount: value })}
                                                    aria-label={`Nominal peserta ${index + 1}`}
                                                    className="w-28 shrink-0"
                                                />
                                            ) : (
                                                <span className="text-muted-foreground shrink-0 text-xs font-medium tabular-nums">
                                                    {rupiah(data.equal_amount)}
                                                </span>
                                            )}

                                            <button
                                                type="button"
                                                aria-label={`Hapus ${participant.name}`}
                                                onClick={() => removeParticipant(index)}
                                                className="text-muted-foreground hover:text-destructive shrink-0 rounded-lg p-1.5 transition"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </Section>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-3">
                        <div className="surface-deep rounded-2xl px-4 py-5">
                            <div className="flex items-start gap-3">
                                <CategoryIcon category={data.category} size="sm" className="bg-white/15 text-white" />
                                <div className="min-w-0">
                                    <h2 className="text-brand-deep-foreground truncate text-base font-bold tracking-tight">
                                        {data.title || 'Tanpa judul'}
                                    </h2>
                                    {data.description && <p className="text-brand-deep-muted mt-0.5 text-xs">{data.description}</p>}
                                </div>
                            </div>

                            <p className="text-brand-deep-muted mt-5 text-[11px]">Target terkumpul</p>
                            <p className="text-brand-deep-foreground mt-1 text-[28px] leading-none font-bold tracking-tight sm:text-3xl">
                                {rupiah(target)}
                            </p>
                        </div>

                        <Section title="Ringkasan">
                            <dl className="space-y-2.5 text-xs">
                                <div className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">Peserta</dt>
                                    <dd className="font-semibold">{data.participants.length} orang</dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">Pembagian</dt>
                                    <dd className="text-right font-semibold">
                                        {data.split_type === 'EQUAL' ? `${rupiah(data.equal_amount)} / orang` : 'Nominal berbeda'}
                                    </dd>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <dt className="text-muted-foreground">Batas bayar</dt>
                                    <dd className="text-right font-semibold">
                                        {data.expires_at
                                            ? new Date(data.expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                                            : 'Tanpa batas'}
                                    </dd>
                                </div>
                            </dl>
                        </Section>

                        <Section title="Peserta">
                            <ul className="divide-border divide-y">
                                {data.participants.map((participant, index) => (
                                    <li key={index} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                                        <span className="truncate text-xs font-medium">
                                            {participant.name}
                                            {participant.note && <span className="text-muted-foreground"> · {participant.note}</span>}
                                        </span>
                                        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                            {rupiah(data.split_type === 'EQUAL' ? data.equal_amount : (participant.amount ?? 0))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </Section>
                    </div>
                )}

                <PasteNamesSheet
                    open={pasting}
                    initialText={pastedText}
                    onOpenChange={(open) => {
                        setPasting(open);
                        if (!open) setPastedText('');
                    }}
                    onConfirm={appendNames}
                />

                <div className="mt-5 flex gap-2.5">
                    {step > 0 && (
                        <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl px-4 text-sm font-semibold"
                            onClick={() => setStep(step - 1)}
                        >
                            <ArrowLeft className="size-4" />
                            Kembali
                        </Button>
                    )}

                    {step < steps.length - 1 ? (
                        <Button
                            type="button"
                            className="h-11 flex-1 rounded-xl text-sm font-semibold"
                            disabled={!canContinue}
                            onClick={() => setStep(step + 1)}
                        >
                            Lanjut
                            <ArrowRight className="size-4" />
                        </Button>
                    ) : (
                        <Button type="submit" className="h-11 flex-1 rounded-xl text-sm font-semibold" disabled={processing}>
                            {processing ? 'Membuat...' : 'Buat Patungan'}
                        </Button>
                    )}
                </div>
            </form>
        </PatunganLayout>
    );
}
