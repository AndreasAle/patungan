import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { formatDate, formatTime, rupiah } from '@/lib/format';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, Check, Download, ExternalLink, ReceiptText, Share2, ShieldCheck } from 'lucide-react';
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
        const text = `Bukti pembayaran ${patungan.title} — ${invoice.participant_name}, ${rupiah(invoice.amount)}. ${invoice.number}`;

        if (navigator.share) {
            try {
                await navigator.share({ title: `Bukti pembayaran ${invoice.number}`, text, url: invoice.verify_url });

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
            <Head title={`Bukti Pembayaran ${invoice.number}`} />

            <div className="mx-auto w-full max-w-lg">
                <Link
                    href={route('public.patungan.show', patungan.public_token)}
                    className="text-muted-foreground hover:text-primary inline-flex items-center gap-1.5 text-xs font-semibold transition-colors print:hidden"
                >
                    <ArrowLeft className="size-3.5" />
                    Kembali ke patungan
                </Link>

                <article className="invoice-paper border-border bg-card mt-3 overflow-hidden rounded-[28px] border shadow-[0_18px_55px_-35px_rgba(5,67,46,0.45)]">
                    <div className="h-2 bg-[linear-gradient(90deg,var(--primary)_0%,var(--primary)_70%,var(--lime)_70%,var(--lime)_100%)]" />

                    <header className="relative px-5 pt-5 pb-6 sm:px-7 sm:pt-7">
                        <div className="flex items-start justify-between gap-4">
                            <AppLogo size="md" />
                            <span className="bg-lime text-lime-foreground inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold tracking-[0.08em] uppercase">
                                <Check className="size-3" strokeWidth={3} />
                                Lunas
                            </span>
                        </div>

                        <div className="mt-8 flex items-end justify-between gap-4">
                            <div>
                                <div className="text-primary mb-2 flex items-center gap-2">
                                    <ReceiptText className="size-4" />
                                    <p className="text-[10px] font-extrabold tracking-[0.18em] uppercase">Bukti pembayaran</p>
                                </div>
                                <h1 className="display text-foreground text-xl leading-tight tracking-tight sm:text-2xl">{invoice.number}</h1>
                            </div>
                            <p className="text-muted-foreground hidden text-right text-[10px] leading-relaxed sm:block">
                                Diterbitkan
                                <br />
                                <span className="text-foreground font-semibold">{formatDate(invoice.issued_at)}</span>
                            </p>
                        </div>
                    </header>

                    <div className="bg-brand-deep text-brand-deep-foreground grid grid-cols-2 gap-4 px-5 py-4 sm:px-7">
                        <div>
                            <p className="text-brand-deep-muted text-[9px] font-bold tracking-[0.15em] uppercase">Tanggal bayar</p>
                            <p className="mt-1 text-xs font-semibold">{formatDate(invoice.issued_at)}</p>
                            <p className="text-brand-deep-muted mt-0.5 text-[10px]">Pukul {formatTime(invoice.issued_at)}</p>
                        </div>
                        <div className="border-l border-white/15 pl-4">
                            <p className="text-brand-deep-muted text-[9px] font-bold tracking-[0.15em] uppercase">Metode pembayaran</p>
                            <p className="mt-1 text-xs font-semibold">{invoice.method_label}</p>
                            <p className="text-brand-deep-muted mt-0.5 text-[10px]">Pembayaran diterima</p>
                        </div>
                    </div>

                    <div className="px-5 py-6 sm:px-7 sm:py-7">
                        <section className="grid grid-cols-2 gap-5">
                            <div>
                                <p className="text-muted-foreground text-[9px] font-bold tracking-[0.14em] uppercase">Dibayar oleh</p>
                                <p className="mt-1.5 text-sm font-extrabold tracking-tight">{invoice.participant_name}</p>
                                <p className="text-muted-foreground mt-1 text-[10px]">Peserta patungan</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground text-[9px] font-bold tracking-[0.14em] uppercase">Diterima oleh</p>
                                <p className="mt-1.5 truncate text-sm font-extrabold tracking-tight">{patungan.organizer_name}</p>
                                <p className="text-muted-foreground mt-1 text-[10px]">Penyelenggara patungan</p>
                            </div>
                        </section>

                        <section className="mt-6 overflow-hidden rounded-2xl border">
                            <div className="bg-surface text-muted-foreground grid grid-cols-[1fr_auto] gap-3 px-4 py-2.5 text-[9px] font-bold tracking-[0.13em] uppercase">
                                <span>Rincian pembayaran</span>
                                <span>Jumlah</span>
                            </div>
                            <div className="grid grid-cols-[1fr_auto] items-start gap-4 px-4 py-4">
                                <div className="min-w-0">
                                    <p className="text-sm leading-snug font-bold">Kontribusi patungan</p>
                                    <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">{patungan.title}</p>
                                    {invoice.note && <p className="text-muted-foreground mt-1.5 text-[10px] italic">Catatan: {invoice.note}</p>}
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold tabular-nums">{rupiah(invoice.amount)}</p>
                                    <p className="text-muted-foreground mt-1 text-[10px]">1 bagian</p>
                                </div>
                            </div>
                        </section>

                        <section className="mt-4 ml-auto w-full sm:w-[72%]">
                            <div className="text-muted-foreground flex items-center justify-between py-2 text-xs">
                                <span>Subtotal</span>
                                <span className="text-foreground font-semibold tabular-nums">{rupiah(invoice.amount)}</span>
                            </div>
                            <div className="border-border flex items-end justify-between gap-4 border-t pt-3">
                                <div>
                                    <p className="text-[10px] font-extrabold tracking-[0.12em] uppercase">Total dibayar</p>
                                    <p className="text-success mt-1 flex items-center gap-1 text-[10px] font-semibold">
                                        <Check className="size-3" strokeWidth={3} />
                                        Sudah lunas
                                    </p>
                                </div>
                                <p className="display text-primary text-xl tabular-nums sm:text-2xl">{rupiah(invoice.amount)}</p>
                            </div>
                        </section>

                        {invoice.is_manual && (
                            <div className="bg-warning-soft text-warning mt-5 flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-[10px] leading-relaxed">
                                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                                <p>
                                    Pembayaran dicatat oleh penyelenggara melalui tunai atau transfer langsung. Transaksi ini tidak diproses melalui
                                    QRIS Patungan.
                                </p>
                            </div>
                        )}

                        <section className="bg-surface mt-6 grid grid-cols-[94px_1fr] items-center gap-4 rounded-2xl p-4 sm:grid-cols-[108px_1fr] sm:gap-5">
                            <div className="rounded-xl bg-white p-2 shadow-sm">
                                <QRCodeSVG value={invoice.verify_url} size={108} level="M" className="h-auto w-full" />
                            </div>
                            <div>
                                <div className="text-primary flex items-center gap-1.5">
                                    <ShieldCheck className="size-4" />
                                    <p className="text-[10px] font-extrabold tracking-[0.1em] uppercase">Verifikasi bukti bayar</p>
                                </div>
                                <p className="text-muted-foreground mt-2 text-[10px] leading-relaxed sm:text-[11px]">
                                    Scan QR untuk membuka bukti pembayaran resmi dan memastikan detailnya masih valid.
                                </p>
                                <a
                                    href={invoice.verify_url}
                                    className="text-primary mt-2 inline-flex items-center gap-1 text-[10px] font-bold print:hidden"
                                >
                                    Buka halaman verifikasi
                                    <ExternalLink className="size-3" />
                                </a>
                            </div>
                        </section>

                        <div className="mt-5 grid grid-cols-2 gap-2.5 print:hidden">
                            <Button variant="outline" className="h-11 rounded-xl text-xs font-bold" onClick={share}>
                                <Share2 className="size-4" />
                                {shared ? 'Link tersalin' : 'Bagikan'}
                            </Button>
                            <Button className="h-11 rounded-xl text-xs font-bold" onClick={() => window.print()}>
                                <Download className="size-4" />
                                Simpan PDF
                            </Button>
                        </div>
                    </div>

                    <footer className="border-border bg-surface flex items-center justify-between gap-4 border-t px-5 py-4 sm:px-7">
                        <div className="flex items-center gap-2">
                            <AppLogoIcon className="size-5" />
                            <p className="text-muted-foreground text-[9px] leading-relaxed">
                                Bukti pembayaran resmi dari
                                <br />
                                <span className="text-foreground font-bold">Patungan</span>
                            </p>
                        </div>
                        <p className="text-muted-foreground max-w-[170px] text-right text-[8px] leading-relaxed">
                            Simpan dokumen ini sebagai bukti bahwa bagian patungan telah dibayar.
                        </p>
                    </footer>
                </article>
            </div>
        </PublicLayout>
    );
}
