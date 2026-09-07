import { QRCodeSVG } from 'qrcode.react';

interface QrCodeCardProps {
    qrUrl: string | null;
    qrString: string | null;
    simulated: boolean;
}

/**
 * Renders whatever the gateway gave us: providers usually return a hosted QR
 * image, and otherwise we draw the EMV payload ourselves.
 */
export function QrCodeCard({ qrUrl, qrString, simulated }: QrCodeCardProps) {
    return (
        <div className="border-border bg-card rounded-2xl border p-5">
            <div className="mx-auto flex aspect-square w-full max-w-[260px] items-center justify-center rounded-xl bg-white p-3">
                {qrUrl ? (
                    <img src={qrUrl} alt="Kode QRIS pembayaran" className="size-full object-contain" />
                ) : qrString ? (
                    <QRCodeSVG value={qrString} className="size-full" level="M" />
                ) : (
                    <p className="text-muted-foreground text-center text-sm">QR belum tersedia.</p>
                )}
            </div>

            <p className="text-foreground mt-4 text-center text-sm font-semibold">Scan QRIS untuk membayar</p>
            <p className="text-muted-foreground mt-1 text-center text-xs leading-relaxed">
                Pakai DANA, GoPay, OVO, ShopeePay, mobile banking, atau aplikasi lain yang mendukung QRIS.
            </p>

            {simulated && (
                <p className="bg-warning-soft text-warning mt-3 rounded-xl px-3 py-2 text-center text-xs font-medium">
                    Mode simulasi. QR ini tidak bisa dipindai aplikasi bank.
                </p>
            )}
        </div>
    );
}
