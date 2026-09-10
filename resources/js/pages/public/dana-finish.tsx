import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';
import { Clock3, House } from 'lucide-react';

/**
 * DANA may send the payer here after handing payment back to Patungan.
 *
 * No status from the URL is trusted. Settlement only comes from a verified
 * webhook or server-to-server reconciliation, so this page says "processing"
 * and points the payer back to the Patungan page they already had open.
 */
export default function DanaFinish() {
    return (
        <PublicLayout>
            <Head title="Pembayaran sedang diproses" />

            <section className="border-border bg-card rounded-3xl border p-7 text-center">
                <span className="bg-warning-soft text-warning mx-auto flex size-14 items-center justify-center rounded-2xl">
                    <Clock3 className="size-7" />
                </span>

                <h1 className="mt-5 text-lg font-extrabold tracking-tight">Pembayaran sedang diproses</h1>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Kembali ke halaman Patungan yang tadi untuk melihat status terbaru. Jangan bayar ulang sebelum statusnya diperbarui.
                </p>

                <Button asChild className="mt-6 h-12 w-full rounded-2xl text-sm font-semibold">
                    <Link href="/">
                        <House className="size-4" />
                        Ke halaman utama
                    </Link>
                </Button>
            </section>
        </PublicLayout>
    );
}
