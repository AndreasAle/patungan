import { BottomSheet } from '@/components/patungan/bottom-sheet';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { ParticipantRow } from '@/components/patungan/participant-row';
import { ParticipantSearch } from '@/components/patungan/participant-search';
import { ProgressBar } from '@/components/patungan/progress-bar';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { percentage, rupiah, timeLeft } from '@/lib/format';
import type { PublicParticipant, PublicPatungan } from '@/types';
import { Head, router } from '@inertiajs/react';
import { AlertCircle, CheckCircle2, Clock3, SearchX, ShieldCheck, UsersRound } from 'lucide-react';
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
    const percent = percentage(patungan.collected_amount, patungan.target_amount);
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

            <section className="surface-deep relative overflow-hidden rounded-[1.75rem] p-5 sm:p-6">
                <span aria-hidden="true" className="absolute -top-12 -right-10 size-40 rounded-full border-[26px] border-white/5" />

                <div className="relative flex items-start gap-3">
                    <CategoryIcon category={patungan.category} size="md" className="text-lime bg-white/12" />
                    <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-lime text-[9px] font-extrabold tracking-[0.15em] uppercase">{patungan.category_label}</p>
                        <h1 className="display text-brand-deep-foreground mt-1 truncate text-xl sm:text-2xl">{patungan.title}</h1>
                        <p className="text-brand-deep-muted mt-1 text-[11px]">
                            {patungan.split_type === 'EQUAL' && patungan.equal_amount
                                ? `${rupiah(patungan.equal_amount)} per orang`
                                : 'Nominal setiap peserta berbeda'}
                        </p>
                    </div>
                    <span className="text-brand-deep-foreground shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-[9px] font-bold">
                        {patungan.status_label}
                    </span>
                </div>

                <div className="relative mt-5 rounded-[1.35rem] bg-white/8 p-4 ring-1 ring-white/10">
                    <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-brand-deep-muted text-[9px] font-bold tracking-[0.13em] uppercase">Dana terkumpul</p>
                            <p className="display text-brand-deep-foreground mt-1.5 truncate text-[30px] tabular-nums">
                                {rupiah(patungan.collected_amount)}
                            </p>
                            <p className="text-brand-deep-muted mt-1 text-[10px] tabular-nums">Target {rupiah(patungan.target_amount)}</p>
                        </div>
                        <span className="bg-lime text-lime-foreground flex size-12 shrink-0 items-center justify-center rounded-full text-xs font-black tabular-nums">
                            {percent}%
                        </span>
                    </div>

                    <ProgressBar className="mt-3.5" value={patungan.collected_amount} total={patungan.target_amount} tone="onDeep" />
                </div>

                <div className="relative mt-3 grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2.5 rounded-2xl bg-white/8 px-3 py-2.5">
                        <UsersRound className="text-lime size-4 shrink-0" />
                        <div>
                            <p className="text-brand-deep-foreground text-xs font-bold tabular-nums">
                                {patungan.paid_participant_count}/{patungan.participant_count}
                            </p>
                            <p className="text-brand-deep-muted text-[9px]">sudah bayar</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-2xl bg-white/8 px-3 py-2.5">
                        <Clock3 className="text-lime size-4 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-brand-deep-foreground truncate text-xs font-bold">
                                {patungan.expires_at ? (remaining ?? 'Waktu habis') : 'Tanpa batas'}
                            </p>
                            <p className="text-brand-deep-muted text-[9px]">{patungan.expires_at ? 'batas pembayaran' : 'tanpa tenggat'}</p>
                        </div>
                    </div>
                </div>
            </section>

            {patungan.description && (
                <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3 dark:border-emerald-400/15 dark:bg-emerald-400/10">
                    <p className="text-muted-foreground text-[9px] font-bold tracking-[0.12em] uppercase">Catatan penyelenggara</p>
                    <p className="mt-1.5 text-xs leading-relaxed">{patungan.description}</p>
                </div>
            )}

            {patungan.status === 'COMPLETED' && (
                <p className="bg-success-soft text-success mt-3 flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-xs font-bold">
                    <CheckCircle2 className="size-4" /> Semua peserta sudah lunas
                </p>
            )}

            {patungan.expires_at && !canPay && patungan.status === 'ACTIVE' && (
                <p className="bg-muted text-muted-foreground mt-3 flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-xs font-medium">
                    <Clock3 className="size-3.5" /> Batas waktu pembayaran sudah lewat.
                </p>
            )}

            {(patungan.status === 'CLOSED' || patungan.status === 'CANCELLED') && (
                <p className="bg-muted text-muted-foreground mt-3 flex items-center justify-center gap-1.5 rounded-2xl px-4 py-3 text-xs font-medium">
                    <AlertCircle className="size-3.5" /> Patungan ini sudah ditutup.
                </p>
            )}

            <section className="mt-6">
                <div className="flex items-end justify-between gap-3 px-1">
                    <div>
                        <p className="text-primary text-[10px] font-extrabold tracking-[0.14em] uppercase">Bayar bagianmu</p>
                        <h2 className="display mt-1 text-xl">Pilih nama kamu</h2>
                    </div>
                    <span className="bg-brand-soft text-primary rounded-full px-3 py-1.5 text-[10px] font-bold tabular-nums">
                        {patungan.participant_count} peserta
                    </span>
                </div>

                <p className="text-muted-foreground mt-2 px-1 text-[11px]">Cari namamu, periksa nominalnya, lalu tekan Bayar.</p>

                <div className="mt-3">
                    <ParticipantSearch value={search} onChange={setSearch} />
                </div>

                {filtered.length === 0 ? (
                    <div className="bg-card mt-3 flex flex-col items-center rounded-2xl border border-dashed border-emerald-100 px-5 py-8 text-center dark:border-emerald-400/15">
                        <SearchX className="text-muted-foreground size-5" />
                        <p className="mt-2.5 text-sm font-bold">Nama tidak ditemukan</p>
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
            </section>

            <div className="bg-card mt-5 flex items-center gap-3 rounded-2xl border border-emerald-100 px-4 py-3 dark:border-emerald-400/15">
                <span className="bg-brand-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <ShieldCheck className="size-4" />
                </span>
                <div className="min-w-0">
                    <p className="text-[10px] font-bold">Dibuat oleh {patungan.organizer_name}</p>
                    <p className="text-muted-foreground mt-0.5 text-[9px]">Pastikan nama dan nominal kamu sudah benar sebelum membayar.</p>
                </div>
            </div>

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
