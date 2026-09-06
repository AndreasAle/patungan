import InputError from '@/components/input-error';
import { ConfirmDialog } from '@/components/patungan/confirm-dialog';
import { EmptyState } from '@/components/patungan/empty-state';
import { PayoutCard, type PayoutDestinationItem } from '@/components/patungan/payout-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PatunganLayout from '@/layouts/patungan-layout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { Landmark } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Channel {
    code: string;
    label: string;
}

interface DestinationsProps {
    channels: Record<string, Channel[]>;
    destinations: PayoutDestinationItem[];
}

export default function PayoutDestinations({ channels, destinations }: DestinationsProps) {
    const [removing, setRemoving] = useState<number | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'BANK',
        provider_code: 'bca',
        account_number: '',
        account_holder: '',
    });

    const options = channels[data.type] ?? [];

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(route('payout.destination.store'), { preserveScroll: true, onSuccess: () => reset('account_number', 'account_holder') });
    };

    return (
        <PatunganLayout title="Rekening tujuan" back={route('payout.index')}>
            <Head title="Rekening tujuan" />

            <h1 className="text-2xl font-extrabold tracking-tight">Rekening tujuan</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Ke mana saldo kamu dikirim saat dicairkan.</p>

            {destinations.length === 0 ? (
                <EmptyState className="mt-5" icon={Landmark} title="Belum ada rekening." description="Tambahkan satu di bawah." />
            ) : (
                <ul className="mt-5 space-y-2">
                    {destinations.map((destination) => (
                        <li key={destination.id}>
                            <PayoutCard
                                destination={destination}
                                onMakeDefault={(id) => router.post(route('payout.destination.default', id), {}, { preserveScroll: true })}
                                onRemove={setRemoving}
                            />
                        </li>
                    ))}
                </ul>
            )}

            <form onSubmit={submit} className="border-border bg-card mt-6 rounded-2xl border p-4">
                <h2 className="font-bold tracking-tight">Tambah rekening</h2>

                <div className="mt-4 grid grid-cols-2 gap-2">
                    {Object.keys(channels).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => {
                                setData('type', type);
                                setData('provider_code', channels[type][0]?.code ?? '');
                            }}
                            className={cn(
                                'rounded-xl border px-4 py-2.5 text-sm font-semibold transition',
                                data.type === type ? 'border-primary bg-brand-soft text-primary' : 'border-border text-muted-foreground',
                            )}
                        >
                            {type === 'BANK' ? 'Bank' : 'E-wallet'}
                        </button>
                    ))}
                </div>

                <div className="mt-4">
                    <Label htmlFor="provider_code">{data.type === 'BANK' ? 'Bank' : 'E-wallet'}</Label>
                    <select
                        id="provider_code"
                        value={data.provider_code}
                        onChange={(event) => setData('provider_code', event.target.value)}
                        className="border-input bg-background mt-1.5 h-12 w-full rounded-xl border px-3 text-sm font-medium"
                    >
                        {options.map((channel) => (
                            <option key={channel.code} value={channel.code}>
                                {channel.label}
                            </option>
                        ))}
                    </select>
                    <InputError message={errors.provider_code} className="mt-1.5" />
                </div>

                <div className="mt-4">
                    <Label htmlFor="account_number">{data.type === 'BANK' ? 'Nomor rekening' : 'Nomor HP terdaftar'}</Label>
                    <Input
                        id="account_number"
                        inputMode="numeric"
                        value={data.account_number}
                        onChange={(event) => setData('account_number', event.target.value.replace(/\D/g, ''))}
                        className="mt-1.5 h-12 rounded-xl tabular-nums"
                    />
                    <InputError message={errors.account_number} className="mt-1.5" />
                </div>

                <div className="mt-4">
                    <Label htmlFor="account_holder">Nama pemilik</Label>
                    <Input
                        id="account_holder"
                        value={data.account_holder}
                        onChange={(event) => setData('account_holder', event.target.value)}
                        className="mt-1.5 h-12 rounded-xl"
                    />
                    <InputError message={errors.account_holder} className="mt-1.5" />
                </div>

                <Button type="submit" className="mt-5 h-12 w-full rounded-xl font-semibold" disabled={processing}>
                    {processing ? 'Menyimpan...' : 'Simpan rekening'}
                </Button>
            </form>

            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => !open && setRemoving(null)}
                title="Hapus rekening ini?"
                description="Rekening akan dihapus dari daftar tujuan pencairan."
                confirmLabel="Hapus"
                destructive
                onConfirm={() => {
                    if (removing === null) return;
                    router.delete(route('payout.destination.destroy', removing), { preserveScroll: true, onFinish: () => setRemoving(null) });
                }}
            />
        </PatunganLayout>
    );
}
