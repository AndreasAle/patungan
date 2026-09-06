import { BottomSheet } from '@/components/patungan/bottom-sheet';
import { CategoryIcon } from '@/components/patungan/category-icon';
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
    // The server is authoritative; this clock only keeps the copy honest.
    const canPay = patungan.accepts_payment && (patungan.expires_at === null || remaining !== null);

    useEffect(() => {
        if (!canPay) return;

        const timer = window.setInterval(() => {
            if (document.hidden) return;

            router.reload({ only: ['patungan'] });
        }, POLL_INTERVAL);

        return () => window.clearInterval(timer);
    }, [canPay]);

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
            { onStart: () => setPaying(true), onFinish: () => setPaying(false) },
        );
    };

    return (
        <PublicLayout>
            <Head title={patungan.title} />

            {/* Deep green summary card - the one place money is stated up front. */}
            <section className="surface-deep rounded-3xl px-4 py-5">
                <div className="flex items-start gap-3">
                    <CategoryIcon category={patungan.category} size="sm" className="bg-white/15 text-white" />
                    <div className="min-w-0 flex-1">
                        <h1 className="text-brand-deep-foreground truncate text-base font-bold tracking-tight">{patungan.title}</h1>
                        <p className="text-brand-deep-muted mt-0.5 text-xs">
                            {patungan.split_type === 'EQUAL' && patungan.equal_amount
                                ? `${rupiah(patungan.equal_amount)} / orang`
                                : 'Nominal tiap orang berbeda'}
                        </p>
                    </div>
                </div>

                <div className="mt-5">
                    <p className="text-brand-deep-foreground text-[26px] leading-none font-bold tracking-tight sm:text-3xl">
                        {rupiah(patungan.collected_amount)}
                    </p>
                    <p className="text-brand-deep-muted mt-1 text-[11px]">terkumpul dari {rupiah(patungan.target_amount)}</p>

                    <ProgressBar className="mt-3" value={patungan.collected_amount} total={patungan.target_amount} tone="onDeep" />

                    <div className="text-brand-deep-muted mt-2 flex items-center justify-between text-[11px]">
                        <span>
                            <span className="text-brand-deep-foreground font-semibold">{patungan.paid_participant_count}</span> dari{' '}
                            {patungan.participant_count} sudah bayar
                        </span>
                        {patungan.expires_at && canPay && remaining && (
                            <span className="inline-flex items-center gap-1">
                                <Clock className="size-3" />
                                {remaining}
                            </span>
                        )}
                    </div>
                </div>
            </section>

            {patungan.description && <p className="text-muted-foreground mt-3 px-1 text-xs leading-relaxed">{patungan.description}</p>}

            {patungan.status === 'COMPLETED' && (
                <p className="bg-success-soft text-success mt-3 rounded-xl px-4 py-2.5 text-center text-xs font-semibold">Semua sudah lunas 🎉</p>
            )}

            {patungan.expires_at && !canPay && patungan.status === 'ACTIVE' && (
                <p className="bg-muted text-muted-foreground mt-3 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium">
                    <Clock className="size-3.5" />
                    Batas waktu pembayaran sudah lewat.
                </p>
            )}

            {(patungan.status === 'CLOSED' || patungan.status === 'CANCELLED') && (
                <p className="bg-muted text-muted-foreground mt-3 flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium">
                    <AlertCircle className="size-3.5" />
                    Patungan ini sudah ditutup.
                </p>
            )}

            <div className="mt-5">
                <ParticipantSearch value={search} onChange={setSearch} />
            </div>

            {filtered.length === 0 ? (
                <div className="border-border mt-3 flex flex-col items-center rounded-2xl border border-dashed px-5 py-8 text-center">
                    <SearchX className="text-muted-foreground size-4" />
                    <p className="mt-2.5 text-sm font-semibold">Nama tidak ditemukan.</p>
                    <p className="text-muted-foreground mt-1 text-xs">Coba ketik sebagian nama kamu saja.</p>
                </div>
            ) : (
                <ul className="mt-3 space-y-2">
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

            <p className="text-muted-foreground mt-5 text-center text-[11px]">Dibuat oleh {patungan.organizer_name}</p>

            <BottomSheet
                open={selected !== null}
                onOpenChange={(open) => !open && setSelected(null)}
                title="Bayar patungan"
                description={patungan.title}
            >
                {selected && (
                    <div>
                        <dl className="bg-surface space-y-2.5 rounded-2xl p-4 text-sm">
                            <div className="flex items-center justify-between">
                                <dt className="text-muted-foreground text-xs">Nama</dt>
                                <dd className="font-semibold">{selected.name}</dd>
                            </div>
                            <div className="border-border flex items-center justify-between border-t pt-2.5">
                                <dt className="text-muted-foreground text-xs">Tagihan</dt>
                                <dd className="font-bold tabular-nums">{rupiah(selected.amount_due)}</dd>
                            </div>
                        </dl>

                        {fee_bearer === 'payer' && (
                            <p className="text-muted-foreground mt-2.5 text-center text-[11px]">Biaya layanan ditambahkan di halaman pembayaran.</p>
                        )}

                        <p className="text-muted-foreground mt-3 text-center text-xs">Pastikan kamu memilih nama yang benar.</p>

                        <Button className="mt-3.5 h-11 w-full rounded-xl text-sm font-semibold" onClick={startPayment} disabled={paying}>
                            {paying ? 'Menyiapkan QRIS...' : `Bayar ${rupiah(selected.amount_due)}`}
                        </Button>
                    </div>
                )}
            </BottomSheet>
        </PublicLayout>
    );
}
