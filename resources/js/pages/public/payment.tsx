import { MoneyText } from '@/components/patungan/money-text';
import { PaymentStatus } from '@/components/patungan/payment-status';
import { QrCodeCard } from '@/components/patungan/qr-code-card';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { countdown, rupiah } from '@/lib/format';
import type { PublicPayment } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PaymentPageProps {
    patungan: { title: string; public_token: string; category_label: string };
    participant: { name: string };
    payment: PublicPayment;
}

const POLL_INTERVAL = 4000;

export default function PublicPaymentPage({ patungan, participant, payment }: PaymentPageProps) {
    const [status, setStatus] = useState(payment.status);
    const [now, setNow] = useState(() => Date.now());

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

                const body: { status: PublicPayment['status'] } = await response.json();

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

                <div className="flex flex-col items-center py-10 text-center">
                    <span className="bg-success-soft text-success flex size-16 items-center justify-center rounded-full">
                        <CheckCircle2 className="size-8" />
                    </span>

                    <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Pembayaran berhasil</h1>
                    <MoneyText amount={payment.charged_amount} size="xl" className="text-primary mt-2" />

                    <dl className="border-border bg-card mt-6 w-full space-y-3 rounded-2xl border p-4 text-left">
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground text-sm">Nama</dt>
                            <dd className="font-semibold">{participant.name}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-muted-foreground text-sm">Patungan</dt>
                            <dd className="font-semibold">{patungan.title}</dd>
                        </div>
                    </dl>

                    <Button asChild className="mt-6 h-12 w-full rounded-xl font-semibold">
                        <Link href={route('public.patungan.show', patungan.public_token)}>Kembali ke patungan</Link>
                    </Button>
                </div>
            </PublicLayout>
        );
    }

    return (
        <PublicLayout>
            <Head title={`Bayar ${rupiah(payment.charged_amount)}`} />

            <div className="text-center">
                <p className="text-muted-foreground text-sm">Bayar</p>
                <MoneyText amount={payment.charged_amount} size="xl" className="mt-1 block" />
                <p className="text-muted-foreground mt-2 text-sm">
                    untuk <span className="text-foreground font-semibold">{participant.name}</span> · {patungan.title}
                </p>
            </div>

            <div className="mt-5">
                <QrCodeCard qrUrl={payment.qr_url} qrString={payment.qr_string} simulated={payment.simulated} />
            </div>

            {payment.service_fee > 0 && (
                <dl className="border-border bg-card mt-4 space-y-2 rounded-2xl border p-4 text-sm">
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Tagihan</dt>
                        <dd className="font-medium">{rupiah(payment.amount)}</dd>
                    </div>
                    <div className="flex justify-between">
                        <dt className="text-muted-foreground">Biaya layanan</dt>
                        <dd className="font-medium">{rupiah(payment.service_fee)}</dd>
                    </div>
                    <div className="border-border flex justify-between border-t pt-2">
                        <dt className="font-semibold">Total</dt>
                        <dd className="font-semibold">{rupiah(payment.charged_amount)}</dd>
                    </div>
                </dl>
            )}

            <PaymentStatus className="mt-4" status={effectiveStatus} countdown={remaining} />

            {effectiveStatus !== 'PENDING' && (
                <Button
                    className="mt-4 h-12 w-full rounded-xl font-semibold"
                    onClick={() => router.visit(route('public.patungan.show', patungan.public_token))}
                >
                    Coba bayar lagi
                </Button>
            )}

            <Button asChild variant="ghost" className="mt-2 h-11 w-full rounded-xl">
                <Link href={route('public.patungan.show', patungan.public_token)}>Kembali ke patungan</Link>
            </Button>
        </PublicLayout>
    );
}
