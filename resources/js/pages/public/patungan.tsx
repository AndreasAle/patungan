import { BottomSheet } from '@/components/patungan/bottom-sheet';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { MoneyText } from '@/components/patungan/money-text';
import { ParticipantRow } from '@/components/patungan/participant-row';
import { ParticipantSearch } from '@/components/patungan/participant-search';
import { ProgressBar } from '@/components/patungan/progress-bar';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { rupiah, timeLeft } from '@/lib/format';
import type { PublicParticipant, PublicPatungan } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertCircle, Clock, SearchX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface PublicPatunganProps {
    patungan: PublicPatungan;
    fee_bearer: string;
}

/** How often the page refreshes payment status while it is visible. */
const POLL_INTERVAL = 8000;

export default function PublicPatunganPage({ patungan, fee_bearer }: PublicPatunganProps) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<PublicParticipant | null>(null);
    const [paying, setPaying] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    const remaining = timeLeft(patungan.expires_at, now);
    // The server is authoritative; the clock here only keeps the copy honest.
    const canPay = patungan.accepts_payment && (patungan.expires_at === null || remaining !== null);

    // Light polling so a payment by someone else shows up without a hard refresh.
    useEffect(() => {
        if (!canPay) return;

        const tick = () => {
            if (document.hidden) return;

            router.reload({ only: ['patungan'] });
        };

        const timer = window.setInterval(tick, POLL_INTERVAL);

        return () => window.clearInterval(timer);
    }, [canPay]);

    // Ticks the deadline copy, and flips the page to "closed" the moment it passes.
    useEffect(() => {
        if (!patungan.expires_at) return;

        const timer = window.setInterval(() => setNow(Date.now()), 30000);

        return () => window.clearInterval(timer);
    }, [patungan.expires_at]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (term === '') return patungan.participants;

        return patungan.participants.filter((participant) => participant.name.toLowerCase().includes(term));
    }, [patungan.participants, search]);

    const startPayment = () => {
        if (!selected) return;

        router.post(
            route('public.payment.store', [patungan.public_token, selected.uuid]),
            {},
            {
                onStart: () => setPaying(true),
                onFinish: () => setPaying(false),
            },
        );
    };

    return (
        <PublicLayout>
            <Head title={patungan.title} />

            <header className="flex items-start gap-3">
                <CategoryIcon category={patungan.category} size="lg" />
                <div className="min-w-0">
                    <h1 className="text-xl font-extrabold tracking-tight">{patungan.title}</h1>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                        {patungan.split_type === 'EQUAL' && patungan.equal_amount
                            ? `${rupiah(patungan.equal_amount)} / orang`
                            : 'Nominal tiap orang berbeda'}
                    </p>
                </div>
            </header>

            {patungan.description && <p className="text-muted-foreground mt-3 text-sm">{patungan.description}</p>}

            <div className="border-border bg-card mt-5 rounded-2xl border p-5">
                <div className="flex items-baseline gap-2">
                    <MoneyText amount={patungan.collected_amount} size="lg" className="text-primary" />
                    <span className="text-muted-foreground text-sm">dari {rupiah(patungan.target_amount)}</span>
                </div>

                <ProgressBar
                    className="mt-3"
                    value={patungan.collected_amount}
                    total={patungan.target_amount}
                    tone={patungan.status === 'COMPLETED' ? 'success' : 'brand'}
                />

                <p className="mt-2 text-sm font-medium">
                    {patungan.paid_participant_count} dari {patungan.participant_count} sudah bayar
                </p>
            </div>

            {patungan.status === 'COMPLETED' && (
                <p className="bg-success-soft text-success mt-4 rounded-xl px-4 py-3 text-center text-sm font-semibold">Semua sudah lunas 🎉</p>
            )}

            {patungan.expires_at && canPay && patungan.status === 'ACTIVE' && (
                <p className="bg-warning-soft text-warning mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium">
                    <Clock className="size-4" />
                    Bayar sebelum {new Date(patungan.expires_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} · {remaining}
                </p>
            )}

            {patungan.expires_at && !canPay && patungan.status === 'ACTIVE' && (
                <p className="bg-muted text-muted-foreground mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium">
                    <Clock className="size-4" />
                    Batas waktu pembayaran sudah lewat.
                </p>
            )}

            {(patungan.status === 'CLOSED' || patungan.status === 'CANCELLED') && (
                <p className="bg-muted text-muted-foreground mt-4 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium">
                    <AlertCircle className="size-4" />
                    Patungan ini sudah ditutup.
                </p>
            )}

            <div className="mt-6">
                <ParticipantSearch value={search} onChange={setSearch} />
            </div>

            {filtered.length === 0 ? (
                <div className="border-border mt-4 flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center">
                    <SearchX className="text-muted-foreground size-5" />
                    <p className="mt-3 font-semibold">Nama tidak ditemukan.</p>
                    <p className="text-muted-foreground mt-1 text-sm">Coba ketik sebagian nama kamu saja.</p>
                </div>
            ) : (
                <ul className="mt-4 space-y-2">
                    {filtered.map((participant) => (
                        <ParticipantRow
                            key={participant.uuid}
                            participant={participant}
                            onPay={canPay ? setSelected : undefined}
                            disabled={!canPay}
                        />
                    ))}
                </ul>
            )}

            <p className="text-muted-foreground mt-6 text-center text-xs">Dibuat oleh {patungan.organizer_name}</p>

            <BottomSheet
                open={selected !== null}
                onOpenChange={(open) => !open && setSelected(null)}
                title="Bayar patungan"
                description={patungan.title}
            >
                {selected && (
                    <div>
                        <dl className="bg-muted space-y-3 rounded-2xl p-4">
                            <div className="flex items-center justify-between">
                                <dt className="text-muted-foreground text-sm">Nama</dt>
                                <dd className="font-semibold">{selected.name}</dd>
                            </div>
                            <div className="flex items-center justify-between">
                                <dt className="text-muted-foreground text-sm">Tagihan</dt>
                                <dd>
                                    <MoneyText amount={selected.amount_due} />
                                </dd>
                            </div>
                        </dl>

                        {fee_bearer === 'payer' && (
                            <p className="text-muted-foreground mt-3 text-center text-xs">Biaya layanan ditambahkan di halaman pembayaran.</p>
                        )}

                        <p className="text-muted-foreground mt-4 text-center text-sm">Pastikan kamu memilih nama yang benar.</p>

                        <Button className="mt-4 h-12 w-full rounded-xl text-base font-semibold" onClick={startPayment} disabled={paying}>
                            {paying ? 'Menyiapkan QRIS...' : `Bayar ${rupiah(selected.amount_due)}`}
                        </Button>
                    </div>
                )}
            </BottomSheet>
        </PublicLayout>
    );
}
