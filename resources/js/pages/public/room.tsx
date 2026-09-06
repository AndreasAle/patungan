import InputError from '@/components/input-error';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PublicLayout from '@/layouts/public-layout';
import { rupiah, timeLeft } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PatunganStatus, PublicParticipant } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { AlertCircle, Check, Clock, DoorClosed, LockKeyhole, LogOut, ReceiptText, ShieldCheck } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';

interface RoomPatungan {
    title: string;
    description: string | null;
    category: string;
    category_label: string;
    status: PatunganStatus;
    status_label: string;
    event_date: string | null;
    expires_at: string | null;
    has_expired: boolean;
    accepts_payment: boolean;
    public_token: string;
    organizer_name: string;
    /** Null until a PIN unlocks one row - nobody else's data is ever sent. */
    participant: PublicParticipant | null;
}

interface RoomProps {
    patungan: RoomPatungan;
    fee_bearer: string;
}

const POLL_INTERVAL = 8000;

export default function PrivateRoom({ patungan, fee_bearer }: RoomProps) {
    const participant = patungan.participant;
    const [now, setNow] = useState(() => Date.now());
    const [paying, setPaying] = useState(false);

    const { data, setData, post, processing, errors } = useForm({ pin: '' });

    const remaining = timeLeft(patungan.expires_at, now);
    const canPay = patungan.accepts_payment && (patungan.expires_at === null || remaining !== null);

    useEffect(() => {
        if (!patungan.expires_at) return;

        const timer = window.setInterval(() => setNow(Date.now()), 30000);

        return () => window.clearInterval(timer);
    }, [patungan.expires_at]);

    useEffect(() => {
        if (!participant || participant.is_paid || !canPay) return;

        const timer = window.setInterval(() => {
            if (document.hidden) return;

            router.reload({ only: ['patungan'] });
        }, POLL_INTERVAL);

        return () => window.clearInterval(timer);
    }, [participant, canPay]);

    const unlock = (event: FormEvent) => {
        event.preventDefault();
        post(route('public.room.unlock', patungan.public_token));
    };

    const startPayment = () => {
        if (!participant) return;

        router.post(
            route('public.payment.store', [patungan.public_token, participant.uuid]),
            {},
            { onStart: () => setPaying(true), onFinish: () => setPaying(false) },
        );
    };

    return (
        <PublicLayout>
            <Head title={patungan.title} />

            <section className="surface-deep rounded-3xl px-5 py-6">
                <div className="flex items-start gap-3">
                    <CategoryIcon category={patungan.category} size="sm" className="bg-white/15 text-white" />
                    <div className="min-w-0 flex-1">
                        <span className="chip bg-lime text-lime-foreground mb-1.5">
                            <DoorClosed className="size-3" />
                            Private room
                        </span>
                        <h1 className="display text-brand-deep-foreground truncate text-lg sm:text-xl">{patungan.title}</h1>
                        <p className="text-brand-deep-muted mt-0.5 truncate text-xs">Dari {patungan.organizer_name}</p>
                    </div>
                </div>

                {patungan.expires_at && canPay && remaining && (
                    <p className="text-brand-deep-muted mt-4 inline-flex items-center gap-1 text-[11px]">
                        <Clock className="size-3" />
                        Bayar sebelum {new Date(patungan.expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
                        {remaining}
                    </p>
                )}
            </section>

            {participant === null ? (
                <form onSubmit={unlock} className="border-border bg-card mt-4 rounded-3xl border p-6">
                    <span className="bg-brand-soft text-primary mx-auto flex size-11 items-center justify-center rounded-2xl">
                        <LockKeyhole className="size-5" />
                    </span>

                    <h2 className="display mt-4 text-center text-lg">Masukkan PIN kamu</h2>
                    <p className="text-muted-foreground mt-2 text-center text-xs leading-relaxed">
                        Penyelenggara mengirim PIN 6 digit khusus buat kamu. Kamu cuma akan melihat tagihan kamu sendiri.
                    </p>

                    <Label htmlFor="pin" className="sr-only">
                        PIN
                    </Label>
                    <Input
                        id="pin"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={data.pin}
                        onChange={(event) => setData('pin', event.target.value.replace(/\D/g, ''))}
                        placeholder="••••••"
                        autoFocus
                        className="mt-4 h-14 rounded-xl text-center text-xl font-bold tracking-[0.4em] tabular-nums"
                    />
                    <InputError message={errors.pin} className="mt-2 text-center" />

                    <Button
                        type="submit"
                        className="mt-5 h-12 w-full rounded-full text-sm font-semibold"
                        disabled={processing || data.pin.length < 6}
                    >
                        {processing ? 'Mengecek...' : 'Buka tagihan saya'}
                    </Button>

                    <p className="text-muted-foreground mt-3.5 flex items-start gap-1.5 text-[11px] leading-relaxed">
                        <ShieldCheck className="text-primary mt-0.5 size-3.5 shrink-0" />
                        Nominal peserta lain, total terkumpul, dan daftar peserta tidak ditampilkan di halaman ini.
                    </p>
                </form>
            ) : (
                <>
                    {patungan.description && <p className="text-muted-foreground mt-3 px-1 text-xs leading-relaxed">{patungan.description}</p>}

                    <div className="border-border bg-card mt-3 rounded-2xl border p-5">
                        <p className="text-muted-foreground text-[11px]">Tagihan untuk</p>
                        <p className="mt-0.5 text-base font-bold tracking-tight">{participant.name}</p>
                        {participant.note && <p className="text-muted-foreground mt-0.5 text-xs">{participant.note}</p>}

                        <p className="text-primary mt-4 text-[30px] leading-none font-bold tracking-tight sm:text-4xl">
                            {rupiah(participant.amount_due)}
                        </p>

                        {participant.is_paid ? (
                            <>
                                <p className="bg-success-soft text-success mt-4 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold">
                                    <Check className="size-3.5" strokeWidth={3} />
                                    Sudah lunas
                                </p>
                                {participant.invoice_url && (
                                    <Button asChild className="mt-2.5 h-11 w-full rounded-xl text-sm font-semibold">
                                        <Link href={participant.invoice_url}>
                                            <ReceiptText className="size-4" />
                                            Lihat invoice
                                        </Link>
                                    </Button>
                                )}
                            </>
                        ) : canPay ? (
                            <>
                                {fee_bearer === 'payer' && (
                                    <p className="text-muted-foreground mt-3 text-[11px]">Biaya layanan ditambahkan di halaman pembayaran.</p>
                                )}
                                <Button className="mt-4 h-12 w-full rounded-xl text-sm font-semibold" onClick={startPayment} disabled={paying}>
                                    {paying ? 'Menyiapkan QRIS...' : `Bayar ${rupiah(participant.amount_due)}`}
                                </Button>
                            </>
                        ) : (
                            <p className="bg-muted text-muted-foreground mt-4 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium">
                                <AlertCircle className="size-3.5" />
                                {patungan.has_expired ? 'Batas waktu pembayaran sudah lewat.' : 'Patungan ini sudah ditutup.'}
                            </p>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => router.post(route('public.room.lock', patungan.public_token))}
                        className={cn(
                            'text-muted-foreground hover:text-foreground mt-4 flex w-full items-center justify-center gap-1.5 text-[11px] font-medium',
                        )}
                    >
                        <LogOut className="size-3.5" />
                        Keluar dari room ini
                    </button>
                </>
            )}
        </PublicLayout>
    );
}
