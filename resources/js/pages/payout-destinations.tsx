import InputError from '@/components/input-error';
import { ConfirmDialog } from '@/components/patungan/confirm-dialog';
import { Eyebrow, PanelHeading } from '@/components/patungan/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PatunganLayout from '@/layouts/patungan-layout';
import { cn } from '@/lib/utils';
import { Head, router, useForm } from '@inertiajs/react';
import { Landmark, Shield, Star, Trash2, Wallet } from 'lucide-react';
import { useState, type FormEvent } from 'react';

interface Channel {
    code: string;
    label: string;
}

interface Destination {
    id: number;
    type: string;
    label: string;
    account_holder: string;
    is_default: boolean;
}

interface DestinationsProps {
    channels: Record<string, Channel[]>;
    destinations: Destination[];
}

const typeLabels: Record<string, string> = { BANK: 'Bank', EWALLET: 'E-wallet' };

export default function PayoutDestinations({ channels, destinations }: DestinationsProps) {
    const [removing, setRemoving] = useState<Destination | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        type: 'BANK',
        provider_code: 'bca',
        account_number: '',
        account_holder: '',
    });

    const options = channels[data.type] ?? [];
    const isBank = data.type === 'BANK';

    const submit = (event: FormEvent) => {
        event.preventDefault();
        post(route('payout.destination.store'), { preserveScroll: true, onSuccess: () => reset('account_number', 'account_holder') });
    };

    return (
        <PatunganLayout
            wide
            title="Rekening tujuan"
            back={route('payout.index')}
            hero={
                <div>
                    <Eyebrow onDeep>Pencairan</Eyebrow>
                    <h1 className="display text-brand-deep-foreground mt-3 text-[26px] sm:text-4xl">Rekening tujuan</h1>
                    <p className="text-brand-deep-muted mt-4 max-w-md text-xs leading-relaxed sm:text-sm">
                        Ke mana saldo kamu dikirim saat dicairkan. Nomor rekening cuma disimpan di server dan selalu ditampilkan tersamar.
                    </p>
                </div>
            }
        >
            <Head title="Rekening tujuan" />

            <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
                <section className="border-border bg-card min-w-0 rounded-3xl border p-5">
                    <PanelHeading>Tujuan kamu · {destinations.length} tersimpan</PanelHeading>

                    {destinations.length === 0 ? (
                        <p className="text-muted-foreground mt-4 text-xs leading-relaxed">
                            Belum ada rekening. Tambahkan satu lewat form di samping.
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-2">
                            {destinations.map((destination) => (
                                <li
                                    key={destination.id}
                                    className={cn(
                                        'bg-card flex items-center gap-3 rounded-2xl border p-4',
                                        destination.is_default ? 'border-primary/40' : 'border-border',
                                    )}
                                >
                                    <span className="bg-brand-soft text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                                        {destination.type === 'BANK' ? <Landmark className="size-[18px]" /> : <Wallet className="size-[18px]" />}
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold tracking-tight">{destination.label}</p>
                                        <p className="text-muted-foreground truncate text-[11px]">{destination.account_holder}</p>
                                    </div>

                                    {destination.is_default ? (
                                        <span className="chip bg-brand-soft text-primary shrink-0">
                                            <Star className="size-3" />
                                            Utama
                                        </span>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.post(route('payout.destination.default', destination.id), {}, { preserveScroll: true })
                                            }
                                            className="text-primary shrink-0 text-[11px] font-semibold"
                                        >
                                            Jadikan utama
                                        </button>
                                    )}

                                    <button
                                        type="button"
                                        aria-label={`Hapus ${destination.label}`}
                                        onClick={() => setRemoving(destination)}
                                        className="text-muted-foreground hover:text-destructive shrink-0 rounded-lg p-1.5 transition"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <form onSubmit={submit} className="border-border bg-card min-w-0 rounded-3xl border p-5">
                    <PanelHeading>Tambah rekening</PanelHeading>
                    <p className="text-muted-foreground mt-2 text-xs">Pastikan nama pemilik sama persis dengan yang terdaftar.</p>

                    <div className="mt-3.5 grid grid-cols-2 gap-2">
                        {Object.keys(channels).map((type) => {
                            const active = data.type === type;

                            return (
                                <button
                                    key={type}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => {
                                        setData('type', type);
                                        setData('provider_code', channels[type][0]?.code ?? '');
                                    }}
                                    className={cn(
                                        'flex h-10 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition',
                                        active ? 'border-primary bg-brand-soft text-primary' : 'border-border text-muted-foreground',
                                    )}
                                >
                                    {type === 'BANK' ? <Landmark className="size-3.5" /> : <Wallet className="size-3.5" />}
                                    {typeLabels[type] ?? type}
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-3.5">
                        <Label htmlFor="provider_code">{isBank ? 'Pilih bank' : 'Pilih e-wallet'}</Label>
                        <select
                            id="provider_code"
                            value={data.provider_code}
                            onChange={(event) => setData('provider_code', event.target.value)}
                            className="border-input bg-background focus-visible:ring-ring mt-1.5 h-11 w-full rounded-xl border px-3 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
                        >
                            {options.map((channel) => (
                                <option key={channel.code} value={channel.code}>
                                    {channel.label}
                                </option>
                            ))}
                        </select>
                        <InputError message={errors.provider_code} className="mt-1.5" />
                    </div>

                    <div className="mt-3.5">
                        <Label htmlFor="account_number">{isBank ? 'Nomor rekening' : 'Nomor HP terdaftar'}</Label>
                        <Input
                            id="account_number"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder={isBank ? '1234567890' : '08123456789'}
                            value={data.account_number}
                            onChange={(event) => setData('account_number', event.target.value.replace(/\D/g, ''))}
                            className="mt-1.5 h-11 rounded-xl tabular-nums"
                        />
                        <InputError message={errors.account_number} className="mt-1.5" />
                    </div>

                    <div className="mt-3.5">
                        <Label htmlFor="account_holder">Nama pemilik</Label>
                        <Input
                            id="account_holder"
                            placeholder="Sesuai buku tabungan"
                            value={data.account_holder}
                            onChange={(event) => setData('account_holder', event.target.value)}
                            className="mt-1.5 h-11 rounded-xl"
                        />
                        <InputError message={errors.account_holder} className="mt-1.5" />
                    </div>

                    <p className="bg-surface text-muted-foreground mt-3.5 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed">
                        <Shield className="text-primary mt-0.5 size-3.5 shrink-0" />
                        Nomor rekening tidak pernah dikirim balik ke browser. Di mana pun ditampilkan, formatnya jadi seperti BCA ******8291.
                    </p>

                    <Button type="submit" className="mt-5 h-12 w-full rounded-full text-sm font-semibold" disabled={processing}>
                        {processing ? 'Menyimpan...' : 'Simpan rekening'}
                    </Button>
                </form>
            </div>

            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => !open && setRemoving(null)}
                title={`Hapus ${removing?.label ?? ''}?`}
                description="Rekening ini dihapus dari daftar tujuan pencairan. Riwayat pencairan yang sudah jalan tidak terpengaruh."
                confirmLabel="Hapus"
                destructive
                onConfirm={() => {
                    if (!removing) return;
                    router.delete(route('payout.destination.destroy', removing.id), { preserveScroll: true, onFinish: () => setRemoving(null) });
                }}
            />
        </PatunganLayout>
    );
}
