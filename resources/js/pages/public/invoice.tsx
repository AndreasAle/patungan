import AppLogoIcon from '@/components/app-logo-icon';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check, Download, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

interface InvoiceProps {
    invoice: {
        number: string;
        issued_at: string | null;
        amount: number;
        method: string | null;
        method_label: string | null;
        is_manual: boolean;
        participant_name: string;
        note: string | null;
        verify_url: string;
    };
    patungan: {
        title: string;
        category: string;
        public_token: string;
        organizer_name: string;
    };
}

export default function Invoice({ invoice, patungan }: InvoiceProps) {
    const [shared, setShared] = useState(false);

    const share = async () => {
        const text = `Bukti bayar ${patungan.title} — ${invoice.participant_name}, ${rupiah(invoice.amount)}. ${invoice.number}`;

        if (navigator.share) {
            try {
                await navigator.share({ title: `Invoice ${invoice.number}`, text, url: invoice.verify_url });

                return;
            } catch {
                // Share sheet dismissed - fall through to copying instead.
            }
        }

        try {
            await navigator.clipboard.writeText(invoice.verify_url);
            setShared(true);
            window.setTimeout(() => setShared(false), 2000);
        } catch {
            setShared(false);
        }
    };

    return (
        <PublicLayout>
            <Head title={`Invoice ${invoice.number}`} />

            <Link
                href={route('public.patungan.show', patungan.public_token)}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium print:hidden"
            >
                <ArrowLeft className="size-3.5" />
                Kembali ke patungan
            </Link>

            <article className="border-border bg-card mt-3 overflow-hidden rounded-3xl border">
                <header className="surface-deep px-5 py-5">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-brand-deep-muted text-[11px]">Invoice</p>
                            <h1 className="text-brand-deep-foreground mt-0.5 text-lg font-bold tracking-tight">{invoice.number}</h1>
                        </div>
                        <span className="bg-lime text-lime-foreground inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold">
                            <Check className="size-3" strokeWidth={3} />
                            LUNAS
                        </span>
                    </div>

                    <p className="text-brand-deep-foreground mt-5 text-[28px] leading-none font-bold tracking-tight sm:text-4xl">
                        {rupiah(invoice.amount)}
                    </p>
                    <p className="text-brand-deep-muted mt-1.5 text-[11px]">
                        Dibayar {formatDateTime(invoice.issued_at)} · {invoice.method_label}
                    </p>
                </header>

                <div className="px-5 py-5">
                    <div className="flex items-center gap-3">
                        <CategoryIcon category={patungan.category} size="sm" />
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{patungan.title}</p>
                            <p className="text-muted-foreground truncate text-xs">Diselenggarakan oleh {patungan.organizer_name}</p>
                        </div>
                    </div>

                    <dl className="border-border mt-4 space-y-2.5 border-t pt-4 text-xs">
                        <div className="flex items-start justify-between gap-4">
                            <dt className="text-muted-foreground">Dibayar oleh</dt>
                            <dd className="text-right font-semibold">{invoice.participant_name}</dd>
                        </div>
                        {invoice.note && (
                            <div className="flex items-start justify-between gap-4">
                                <dt className="text-muted-foreground">Catatan</dt>
                                <dd className="text-right font-medium">{invoice.note}</dd>
                            </div>
                        )}
                        <div className="flex items-start justify-between gap-4">
                            <dt className="text-muted-foreground">Metode</dt>
                            <dd className="text-right font-semibold">{invoice.method_label}</dd>
                        </div>
                        <div className="border-border flex items-baseline justify-between gap-4 border-t pt-2.5">
                            <dt className="text-sm font-semibold">Total dibayar</dt>
                            <dd className="text-sm font-bold tabular-nums">{rupiah(invoice.amount)}</dd>
                        </div>
                    </dl>

                    {invoice.is_manual && (
                        <p className="bg-warning-soft text-warning mt-4 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed">
                            Pembayaran ini dicatat manual oleh penyelenggara (tunai atau transfer langsung), bukan lewat QRIS Patungan.
                        </p>
                    )}

                    <div className="bg-surface mt-5 flex flex-col items-center rounded-2xl px-4 py-5">
                        <div className="rounded-xl bg-white p-2.5">
                            <QRCodeSVG value={invoice.verify_url} size={124} level="M" />
                        </div>
                        <p className="text-muted-foreground mt-3 text-center text-[11px] leading-relaxed">
                            Scan untuk membuka bukti bayar ini
                            <br />
                            dan mengecek keasliannya.
                        </p>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2.5 print:hidden">
                        <Button variant="outline" className="h-11 rounded-xl text-sm font-semibold" onClick={share}>
                            <Share2 className="size-4" />
                            {shared ? 'Link tersalin' : 'Bagikan'}
                        </Button>
                        <Button className="h-11 rounded-xl text-sm font-semibold" onClick={() => window.print()}>
                            <Download className="size-4" />
                            Simpan PDF
                        </Button>
                    </div>
                </div>

                <footer className="border-border text-muted-foreground flex items-center justify-center gap-1.5 border-t px-5 py-3.5 text-[11px]">
                    <AppLogoIcon className="size-4" />
                    Bukti bayar diterbitkan oleh <span className="text-foreground font-semibold">Patungan</span>
                </footer>
            </article>
        </PublicLayout>
    );
}
