import { PaymentStatus } from '@/components/patungan/payment-status';
import { QrCodeCard } from '@/components/patungan/qr-code-card';
import { ShareSheet } from '@/components/patungan/share-sheet';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { countdown, rupiah } from '@/lib/format';
import type { PublicPayment } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Check, ReceiptText, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PaymentPageProps {
    patungan: { title: string; public_token: string; category_label: string };
    participant: { name: string; invoice_url: string | null };
    payment: PublicPayment;
    success_message: string;
}

const POLL_INTERVAL = 4000;

export default function PublicPaymentPage({ patungan, participant, payment, success_message }: PaymentPageProps) {
    const [status, setStatus] = useState(payment.status);
    const [invoiceUrl, setInvoiceUrl] = useState(participant.invoice_url);
    const [now, setNow] = useState(() => Date.now());
    const [shareOpen, setShareOpen] = useState(false);

    /*
     * The success state comes from our own payment record, polled from the
     * server - never from a query string the browser could set.
     */
    useEffect(() => {
        if (status !== 'PENDING') return;

        const poll = window.setInterval(async () => {
            if (document.hidden) return;

            try {
                const response = await fetch(route('public.payment.status', [patungan.public_token, payment.uuid]), {
                    headers: { Accept: 'application/json' },
                });

                if (!response.ok) return;

                const body: { status: PublicPayment['status']; invoice_url: string | null } = await response.json();

                if (body.invoice_url) {
                    setInvoiceUrl(body.invoice_url);
                }

                if (body.status !== status) {
                    setStatus(body.status);
                }
            } catch {
                // A dropped poll is harmless - the next tick tries again.
            }
        }, POLL_INTERVAL);

        return () => window.clearInterval(poll);
    }, [status, patungan.public_token, payment.uuid]);

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), 1000);

        return () => window.clearInterval(timer);
    }, []);

    const remaining = countdown(payment.expires_at, now);
    const effectiveStatus = status === 'PENDING' && remaining === null && payment.expires_at ? 'EXPIRED' : status;

    if (effectiveStatus === 'PAID') {
        return (
            <PublicLayout>
                <Head title="Pembayaran berhasil" />

                <div className="surface-deep rounded-3xl px-5 py-8 text-center">
                    <span className="bg-lime text-lime-foreground mx-auto flex size-14 items-center justify-center rounded-full">
                        <Check className="size-7" strokeWidth={3} />
                    </span>

                    <h1 className="display text-brand-deep-foreground mt-5 text-lg">Pembayaran berhasil</h1>
                    <p className="display text-brand-deep-foreground mt-3 text-[29px] tabular-nums sm:text-4xl">{rupiah(payment.amount)}</p>
                    <p className="text-brand-deep-muted mt-2 text-xs">
                        {participant.name} · {patungan.title}
                    </p>
                </div>

                <div className="mt-4 space-y-2.5">
                    <Button asChild className="h-12 w-full rounded-full text-sm font-semibold">
                        <Link href={route('public.patungan.show', patungan.public_token)}>Kembali ke Patungan</Link>
                    </Button>
                    {invoiceUrl && (
                        <Button asChild variant="outline" className="h-12 w-full rounded-full text-sm font-semibold">
                            <Link href={invoiceUrl}>
                                <ReceiptText className="size-4" />
                                Lihat invoice
                            </Link>
                        </Button>
                    )}
                    <Button variant="ghost" className="h-11 w-full rounded-full text-sm font-semibold" onClick={() => setShareOpen(true)}>
                        <Share2 className="size-4" />
                        Bagikan ke Grup
                    </Button>
                </div>

                <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} title="Bagikan ke grup" message={success_message} />
            </PublicLayout>
        );
    }

    return (
        <PublicLayout>
            <Head title={`Bayar ${rupiah(payment.charged_amount)}`} />

            <div className="surface-deep rounded-3xl px-5 py-5 text-center">
                <p className="text-brand-deep-muted text-[10px] font-semibold tracking-[0.18em] uppercase">Bayar</p>
                <p className="display text-brand-deep-foreground mt-3 text-[29px] tabular-nums sm:text-4xl">{rupiah(payment.charged_amount)}</p>
                <p className="text-brand-deep-muted mt-2 text-xs">
                    untuk <span className="text-brand-deep-foreground font-semibold">{participant.name}</span> · {patungan.title}
                </p>
            </div>

            <div className="mt-3">
                <QrCodeCard qrUrl={payment.qr_url} qrString={payment.qr_string} simulated={payment.simulated} />
            </div>

            {payment.service_fee > 0 && (
                <dl className="border-border bg-card mt-3 space-y-2 rounded-2xl border p-4 text-xs">
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Tagihan</dt>
                        <dd className="font-medium tabular-nums">{rupiah(payment.amount)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Biaya layanan</dt>
                        <dd className="font-medium tabular-nums">{rupiah(payment.service_fee)}</dd>
                    </div>
                    <div className="border-border flex justify-between border-t pt-2">
                        <dt className="text-sm font-semibold">Total</dt>
                        <dd className="text-sm font-bold tabular-nums">{rupiah(payment.charged_amount)}</dd>
                    </div>
                </dl>
            )}

            <PaymentStatus className="mt-3" status={effectiveStatus} countdown={remaining} />

            {effectiveStatus !== 'PENDING' && (
                <Button
                    className="mt-3 h-11 w-full rounded-xl text-sm font-semibold"
                    onClick={() => router.visit(route('public.patungan.show', patungan.public_token))}
                >
                    Coba bayar lagi
                </Button>
            )}

            <Button asChild variant="ghost" className="mt-2 h-11 w-full rounded-xl text-sm">
                <Link href={route('public.patungan.show', patungan.public_token)}>Kembali ke patungan</Link>
            </Button>
        </PublicLayout>
    );
}
