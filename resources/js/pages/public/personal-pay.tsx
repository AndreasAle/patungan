import { CategoryIcon } from '@/components/patungan/category-icon';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { formatDateTime } from '@/lib/format';
import { Head, Link, router } from '@inertiajs/react';
import { CircleCheck, LoaderCircle, Receipt, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface Props {
    patungan: {
        title: string;
        category: string;
        category_label: string;
        public_token: string;
        public_url: string;
        organizer_name: string;
        accepts_payment: boolean;
        expires_at: string | null;
        is_private_room: boolean;
    };
    participant: {
        uuid: string;
        name: string;
        amount_due: number;
        amount_due_formatted: string;
        status: string;
        status_label: string;
        is_settled: boolean;
        is_pending: boolean;
        invoice_url: string | null;
    };
    pay_url: string;
}

/**
 * One person's own bill, opened from a link sent to them directly.
 *
 * The whole point is that there is nothing to find. Somebody who was chased in
 * a WhatsApp message taps once and is looking at their own amount - no list of
 * names to scan, no chance of tapping the wrong one and paying somebody else's
 * share.
 */
export default function PersonalPay({ patungan, participant, pay_url }: Props) {
    const [paying, setPaying] = useState(false);

    const pay = () => {
        router.post(
            pay_url,
            {},
            {
                onStart: () => setPaying(true),
                onFinish: () => setPaying(false),
            },
        );
    };

    return (
        <PublicLayout>
            <Head title={`${participant.name} · ${patungan.title}`} />

            <section className="surface-deep rounded-3xl px-5 py-6">
                <div className="flex items-start gap-3">
                    <CategoryIcon category={patungan.category} size="sm" className="bg-white/15 text-white" />
                    <div className="min-w-0 flex-1">
                        <p className="text-brand-deep-muted text-[11px] font-bold tracking-[0.14em] uppercase">Halo {participant.name}</p>
                        <h1 className="text-brand-deep-foreground mt-1 text-lg leading-tight font-extrabold tracking-tight">{patungan.title}</h1>
                        <p className="text-brand-deep-muted mt-1 text-xs">dari {patungan.organizer_name}</p>
                    </div>
                </div>
            </section>

            {participant.is_settled ? (
                <section className="border-border bg-card mt-4 rounded-3xl border p-6 text-center">
                    <span className="bg-success-soft text-success mx-auto flex size-14 items-center justify-center rounded-2xl">
                        <CircleCheck className="size-7" strokeWidth={2.4} />
                    </span>
                    <p className="mt-4 text-base font-bold tracking-tight">Sudah bayar</p>
                    <p className="text-muted-foreground mt-1.5 text-sm">{participant.amount_due_formatted} sudah masuk. Nggak perlu bayar lagi.</p>

                    {participant.invoice_url && (
                        <Button asChild variant="outline" className="mt-5 h-11 rounded-full px-6 text-sm font-semibold">
                            <a href={participant.invoice_url}>
                                <Receipt className="size-4" />
                                Lihat bukti bayar
                            </a>
                        </Button>
                    )}
                </section>
            ) : (
                <section className="border-border bg-card mt-4 rounded-3xl border p-6 text-center">
                    <p className="text-muted-foreground text-[11px] font-bold tracking-[0.14em] uppercase">Tagihan kamu</p>
                    <p className="display mt-3 text-[40px] leading-none tabular-nums">{participant.amount_due_formatted}</p>

                    {patungan.accepts_payment ? (
                        <>
                            <Button onClick={pay} disabled={paying} className="mt-6 h-14 w-full rounded-2xl text-base font-bold">
                                {paying && <LoaderCircle className="size-5 animate-spin" />}
                                {paying ? 'Menyiapkan QRIS...' : 'Bayar Sekarang'}
                            </Button>

                            {participant.is_pending && (
                                <p className="text-muted-foreground mt-3 text-xs">Kamu punya QRIS yang masih aktif. Tombol ini membukanya lagi.</p>
                            )}
                        </>
                    ) : (
                        <p className="bg-warning-soft text-warning mt-6 rounded-xl px-4 py-3 text-sm font-medium">
                            Patungan ini sudah tidak menerima pembayaran.
                            {patungan.expires_at && ` Batas waktunya ${formatDateTime(patungan.expires_at)}.`}
                        </p>
                    )}

                    {/* Somebody who was forwarded the wrong link should find out
                        here, before they pay for a name that is not theirs. */}
                    <p className="text-muted-foreground mt-5 flex items-center justify-center gap-1.5 text-[11px]">
                        <ShieldCheck className="size-3.5" />
                        Pastikan ini memang tagihan kamu.
                    </p>
                </section>
            )}

            <Link
                href={patungan.public_url}
                className="text-muted-foreground hover:text-foreground mt-5 block text-center text-xs font-semibold transition"
            >
                Lihat patungan lengkapnya
            </Link>
        </PublicLayout>
    );
}
