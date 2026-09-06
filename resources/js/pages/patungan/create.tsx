import InputError from '@/components/input-error';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { DeadlinePicker } from '@/components/patungan/deadline-picker';
import { MoneyText } from '@/components/patungan/money-text';
import { RupiahInput } from '@/components/patungan/rupiah-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PatunganLayout from '@/layouts/patungan-layout';
import { cn } from '@/lib/utils';
import { Head, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
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

const steps = ['Detail', 'Pembagian', 'Peserta', 'Review'];

export default function CreatePatungan({ categories, fee_bearer }: { categories: Category[]; fee_bearer: string }) {
    const [step, setStep] = useState(0);
    const [nameInput, setNameInput] = useState('');

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

    /** Accepts one name, or a whole list pasted from a chat. */
    const addNames = (raw: string) => {
        const names = raw
            .split(/[\n,]/)
            .map((name) => name.trim())
            .filter((name) => name.length > 0);

        if (names.length === 0) return;

        setData('participants', [
            ...data.participants,
            ...names.map((name) => ({ name, amount: data.split_type === 'CUSTOM' ? data.equal_amount || 0 : null, note: null })),
        ]);
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
        <PatunganLayout title="Buat Patungan" back={route('dashboard')}>
            <Head title="Buat Patungan" />

            <div className="mx-auto w-full max-w-xl">
                <ol className="flex items-center gap-2">
                    {steps.map((label, index) => (
                        <li key={label} className="flex flex-1 flex-col gap-1.5">
                            <span className={cn('h-1 rounded-full transition', index <= step ? 'bg-primary' : 'bg-muted')} />
                            <span className={cn('text-xs font-semibold', index === step ? 'text-primary' : 'text-muted-foreground')}>{label}</span>
                        </li>
                    ))}
                </ol>

                <form onSubmit={submit} className="mt-6">
                    {step === 0 && (
                        <div className="space-y-5">
                            <div>
                                <Label htmlFor="title">Judul patungan</Label>
                                <Input
                                    id="title"
                                    value={data.title}
                                    onChange={(event) => setData('title', event.target.value)}
                                    placeholder="Badminton Minggu Malam"
                                    className="mt-1.5 h-12 rounded-xl"
                                    autoFocus
                                />
                                <InputError message={errors.title} className="mt-1.5" />
                            </div>

                            <div>
                                <Label htmlFor="description">Deskripsi (opsional)</Label>
                                <Input
                                    id="description"
                                    value={data.description}
                                    onChange={(event) => setData('description', event.target.value)}
                                    placeholder="Sewa lapangan 2 jam + shuttlecock"
                                    className="mt-1.5 h-12 rounded-xl"
                                />
                                <InputError message={errors.description} className="mt-1.5" />
                            </div>

                            <div>
                                <Label>Kategori</Label>
                                <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                                    {categories.map((category) => (
                                        <button
                                            key={category.value}
                                            type="button"
                                            onClick={() => setData('category', category.value)}
                                            className={cn(
                                                'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition',
                                                data.category === category.value
                                                    ? 'border-primary bg-brand-soft text-primary'
                                                    : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                                            )}
                                        >
                                            <CategoryIcon category={category.value} size="sm" className="bg-transparent" />
                                            {category.label}
                                        </button>
                                    ))}
                                </div>
                                <InputError message={errors.category} className="mt-1.5" />
                            </div>

                            <div>
                                <Label htmlFor="event_date">Tanggal kegiatan (opsional)</Label>
                                <Input
                                    id="event_date"
                                    type="date"
                                    value={data.event_date}
                                    onChange={(event) => setData('event_date', event.target.value)}
                                    className="mt-1.5 h-12 rounded-xl"
                                />
                                <InputError message={errors.event_date} className="mt-1.5" />
                            </div>

                            <div>
                                <DeadlinePicker value={data.expires_at} onChange={(value) => setData('expires_at', value)} />
                                <InputError message={errors.expires_at} className="mt-1.5" />
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-5">
                            <div className="grid gap-2 sm:grid-cols-2">
                                {(
                                    [
                                        { value: 'EQUAL', title: 'Sama rata', body: 'Semua orang bayar nominal yang sama.' },
                                        { value: 'CUSTOM', title: 'Nominal berbeda', body: 'Atur nominal tiap orang sendiri-sendiri.' },
                                    ] as const
                                ).map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setData('split_type', option.value)}
                                        className={cn(
                                            'rounded-2xl border p-4 text-left transition',
                                            data.split_type === option.value
                                                ? 'border-primary bg-brand-soft'
                                                : 'border-border bg-card hover:border-primary/40',
                                        )}
                                    >
                                        <p className="font-semibold">{option.title}</p>
                                        <p className="text-muted-foreground mt-0.5 text-sm">{option.body}</p>
                                    </button>
                                ))}
                            </div>

                            {data.split_type === 'EQUAL' ? (
                                <div>
                                    <Label htmlFor="equal_amount">Nominal per orang</Label>
                                    <RupiahInput
                                        id="equal_amount"
                                        value={data.equal_amount}
                                        onChange={(value) => setData('equal_amount', value)}
                                        placeholder="25.000"
                                        className="mt-1.5"
                                    />
                                    <InputError message={errors.equal_amount} className="mt-1.5" />
                                </div>
                            ) : (
                                <p className="bg-muted text-muted-foreground rounded-xl px-4 py-3 text-sm">
                                    Nominal tiap peserta diisi di langkah berikutnya.
                                </p>
                            )}

                            {fee_bearer === 'payer' && (
                                <p className="bg-warning-soft text-warning rounded-xl px-4 py-3 text-sm">
                                    Biaya layanan ditambahkan ke tagihan peserta saat mereka bayar.
                                </p>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="participant-name">Nama peserta</Label>
                                <div className="mt-1.5 flex gap-2">
                                    <Input
                                        id="participant-name"
                                        value={nameInput}
                                        onChange={(event) => setNameInput(event.target.value)}
                                        onKeyDown={onNameKeyDown}
                                        onPaste={(event) => {
                                            const pasted = event.clipboardData.getData('text');
                                            if (/[\n,]/.test(pasted)) {
                                                event.preventDefault();
                                                addNames(pasted);
                                            }
                                        }}
                                        placeholder="Ketik nama lalu Enter"
                                        className="h-12 rounded-xl"
                                        autoFocus
                                    />
                                    <Button type="button" onClick={() => addNames(nameInput)} className="h-12 rounded-xl px-4">
                                        <Plus className="size-4" />
                                    </Button>
                                </div>
                                <p className="text-muted-foreground mt-1.5 text-xs">Bisa paste banyak nama sekaligus, satu per baris.</p>
                                <InputError message={errors.participants} className="mt-1.5" />
                            </div>

                            <ul className="space-y-2">
                                {data.participants.map((participant, index) => (
                                    <li key={index} className="border-border bg-card flex items-center gap-2 rounded-xl border p-2.5">
                                        <Input
                                            value={participant.name}
                                            onChange={(event) => updateParticipant(index, { name: event.target.value })}
                                            aria-label={`Nama peserta ${index + 1}`}
                                            className="focus-visible:border-input h-10 flex-1 rounded-lg border-transparent bg-transparent font-medium shadow-none"
                                        />

                                        {data.split_type === 'CUSTOM' ? (
                                            <RupiahInput
                                                value={participant.amount ?? 0}
                                                onChange={(value) => updateParticipant(index, { amount: value })}
                                                aria-label={`Nominal peserta ${index + 1}`}
                                                className="w-36"
                                            />
                                        ) : (
                                            <MoneyText amount={data.equal_amount} size="sm" className="text-muted-foreground" />
                                        )}

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            aria-label={`Hapus ${participant.name}`}
                                            onClick={() => removeParticipant(index)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <X className="size-4" />
                                        </Button>
                                    </li>
                                ))}
                            </ul>

                            {data.participants.length === 0 && (
                                <p className="bg-muted text-muted-foreground rounded-xl px-4 py-3 text-sm">
                                    Belum ada peserta. Tambahkan minimal satu.
                                </p>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="border-border bg-card rounded-2xl border p-5">
                                <div className="flex items-start gap-3">
                                    <CategoryIcon category={data.category} />
                                    <div className="min-w-0">
                                        <h2 className="truncate text-lg font-bold tracking-tight">{data.title}</h2>
                                        {data.description && <p className="text-muted-foreground mt-0.5 text-sm">{data.description}</p>}
                                    </div>
                                </div>

                                <dl className="mt-5 space-y-2.5 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Peserta</dt>
                                        <dd className="font-semibold">{data.participants.length} orang</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Pembagian</dt>
                                        <dd className="font-semibold">
                                            {data.split_type === 'EQUAL' ? `Rp${data.equal_amount.toLocaleString('id-ID')}/orang` : 'Nominal berbeda'}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-muted-foreground">Batas bayar</dt>
                                        <dd className="font-semibold">
                                            {data.expires_at
                                                ? new Date(data.expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                                                : 'Tanpa batas'}
                                        </dd>
                                    </div>
                                    <div className="border-border flex justify-between border-t pt-2.5">
                                        <dt className="text-muted-foreground">Target terkumpul</dt>
                                        <dd>
                                            <MoneyText amount={target} size="lg" className="text-primary" />
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <ul className="space-y-1.5">
                                {data.participants.map((participant, index) => (
                                    <li key={index} className="bg-card flex items-center justify-between rounded-xl px-4 py-2.5 text-sm">
                                        <span className="font-medium">{participant.name}</span>
                                        <MoneyText
                                            amount={data.split_type === 'EQUAL' ? data.equal_amount : (participant.amount ?? 0)}
                                            size="sm"
                                            className="text-muted-foreground"
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <div className="mt-8 flex gap-3">
                        {step > 0 && (
                            <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setStep(step - 1)}>
                                <ArrowLeft className="size-4" />
                                Kembali
                            </Button>
                        )}

                        {step < steps.length - 1 ? (
                            <Button
                                type="button"
                                className="h-12 flex-1 rounded-xl font-semibold"
                                disabled={!canContinue}
                                onClick={() => setStep(step + 1)}
                            >
                                Lanjut
                                <ArrowRight className="size-4" />
                            </Button>
                        ) : (
                            <Button type="submit" className="h-12 flex-1 rounded-xl font-semibold" disabled={processing}>
                                {processing ? 'Membuat...' : 'Buat Patungan'}
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </PatunganLayout>
    );
}
