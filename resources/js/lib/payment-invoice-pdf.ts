import { rupiah } from '@/lib/format';

export interface PaymentInvoicePdfData {
    number: string;
    issuedDate: string;
    issuedTime: string;
    amount: number;
    method: string;
    participantName: string;
    organizerName: string;
    patunganTitle: string;
    note: string | null;
    isManual: boolean;
}

const palette = {
    deep: [8, 71, 49] as const,
    green: [18, 111, 76] as const,
    lime: [190, 241, 54] as const,
    ink: [19, 36, 30] as const,
    muted: [104, 126, 117] as const,
    line: [218, 232, 225] as const,
    mint: [240, 248, 244] as const,
    warning: [255, 244, 215] as const,
    warningInk: [176, 92, 9] as const,
};

function safeFilename(value: string): string {
    return value.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-');
}

/** Rasterizes the exact mark used by AppLogoIcon so the PDF never substitutes it. */
async function brandMarkPng(): Promise<string> {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
        <path d="M16 40V22A15 15 0 0 1 31 7H36A16.5 16.5 0 0 1 36 40Z" fill="#15563A"/>
        <path d="M37 27H26A15 15 0 0 0 11 42V44A15 15 0 0 0 41 44Z" fill="#A6D93B"/>
    </svg>`;
    const source = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));

    try {
        const image = new Image();

        await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error('Logo Patungan gagal dimuat untuk PDF.'));
            image.src = source;
        });

        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const context = canvas.getContext('2d');

        if (!context) throw new Error('Canvas untuk logo Patungan tidak tersedia.');

        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        return canvas.toDataURL('image/png');
    } finally {
        URL.revokeObjectURL(source);
    }
}

/**
 * Builds a real A4 PDF instead of printing the browser viewport. Keeping the
 * drawing primitive also prevents browser headers, page URLs and responsive
 * layout differences from leaking into the downloaded receipt.
 */
export async function downloadPaymentInvoicePdf(data: PaymentInvoicePdfData, qrDataUrl: string): Promise<void> {
    const { jsPDF } = await import('jspdf');
    const logoDataUrl = await brandMarkPng();
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const left = 18;
    const right = pageWidth - 18;
    const contentWidth = right - left;

    const setText = (color: readonly [number, number, number]) => pdf.setTextColor(color[0], color[1], color[2]);
    const setFill = (color: readonly [number, number, number]) => pdf.setFillColor(color[0], color[1], color[2]);
    const setDraw = (color: readonly [number, number, number]) => pdf.setDrawColor(color[0], color[1], color[2]);
    const label = (value: string, x: number, y: number, color = palette.muted, align: 'left' | 'right' = 'left') => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7);
        setText(color);
        pdf.text(value.toUpperCase(), x, y, { charSpace: 0.7, align });
    };
    const value = (text: string, x: number, y: number, size = 10, align: 'left' | 'right' = 'left') => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(size);
        setText(palette.ink);
        pdf.text(text, x, y, { align });
    };

    pdf.setProperties({
        title: `Bukti Pembayaran ${data.number}`,
        subject: `Pembayaran untuk ${data.patunganTitle}`,
        author: 'Patungan',
        creator: 'Patungan',
    });

    setFill(palette.mint);
    pdf.rect(0, 0, pageWidth, 297, 'F');

    setFill([255, 255, 255]);
    pdf.roundedRect(12, 10, pageWidth - 24, 277, 4, 4, 'F');
    setDraw(palette.line);
    pdf.roundedRect(12, 10, pageWidth - 24, 277, 4, 4, 'S');

    setFill(palette.deep);
    pdf.rect(12, 10, 130, 3, 'F');
    setFill(palette.lime);
    pdf.rect(142, 10, pageWidth - 154, 3, 'F');

    pdf.addImage(logoDataUrl, 'PNG', left, 20.5, 12, 12, undefined, 'FAST');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(15);
    setText(palette.deep);
    pdf.text('Patungan', left + 15, 29.3);

    setFill(palette.lime);
    pdf.roundedRect(right - 27, 21.5, 27, 9, 4.5, 4.5, 'F');
    setDraw(palette.deep);
    pdf.setLineWidth(0.65);
    pdf.line(right - 23, 25.8, right - 21.8, 27);
    pdf.line(right - 21.8, 27, right - 19.5, 24.5);
    pdf.setFontSize(8);
    setText(palette.deep);
    pdf.text('LUNAS', right - 11.5, 27.2, { align: 'center' });

    label('Bukti pembayaran', left, 48, palette.green);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    setText(palette.ink);
    pdf.text(data.number, left, 58);
    label('Diterbitkan', right, 48, palette.muted, 'right');
    value(data.issuedDate, right, 55, 9, 'right');

    setFill(palette.deep);
    pdf.rect(12, 67, pageWidth - 24, 29, 'F');
    label('Tanggal bayar', left, 78, [166, 206, 189]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    setText([255, 255, 255]);
    pdf.text(data.issuedDate, left, 85);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setText([166, 206, 189]);
    pdf.text(`Pukul ${data.issuedTime}`, left, 90);

    setDraw([62, 112, 92]);
    pdf.line(104, 73, 104, 90);
    label('Metode pembayaran', 112, 78, [166, 206, 189]);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    setText([255, 255, 255]);
    pdf.text(data.method, 112, 85);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setText([166, 206, 189]);
    pdf.text('Pembayaran diterima', 112, 90);

    label('Dibayar oleh', left, 110);
    value(data.participantName, left, 117, 11);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setText(palette.muted);
    pdf.text('Peserta patungan', left, 122);

    label('Diterima oleh', 110, 110);
    value(data.organizerName, 110, 117, 11);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setText(palette.muted);
    pdf.text('Penyelenggara patungan', 110, 122);

    setFill(palette.mint);
    pdf.roundedRect(left, 134, contentWidth, 12, 3, 3, 'F');
    label('Rincian pembayaran', left + 5, 141.5);
    label('Jumlah', right - 5, 141.5, palette.muted, 'right');

    setDraw(palette.line);
    pdf.roundedRect(left, 134, contentWidth, 42, 3, 3, 'S');
    value('Kontribusi patungan', left + 5, 155, 11);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    setText(palette.muted);
    const titleLines = pdf.splitTextToSize(data.patunganTitle, 96) as string[];
    pdf.text(titleLines.slice(0, 2), left + 5, 161, { lineHeightFactor: 1.25 });
    value(rupiah(data.amount), right - 5, 155, 11, 'right');
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setText(palette.muted);
    pdf.text('1 bagian', right - 5, 161, { align: 'right' });

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    setText(palette.muted);
    pdf.text('Subtotal', 112, 188);
    value(rupiah(data.amount), right, 188, 10, 'right');
    setDraw(palette.line);
    pdf.line(112, 193, right, 193);
    label('Total dibayar', 112, 202, palette.ink);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    setText(palette.green);
    pdf.text(rupiah(data.amount), right, 203, { align: 'right' });
    pdf.setFontSize(8);
    pdf.text('Sudah lunas', 112, 209);

    let verificationY = 219;

    if (data.isManual) {
        setFill(palette.warning);
        pdf.roundedRect(left, 216, contentWidth, 14, 3, 3, 'F');
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(7.5);
        setText(palette.warningInk);
        pdf.text('Pembayaran dicatat penyelenggara melalui tunai atau transfer langsung, bukan melalui QRIS Patungan.', left + 5, 224.5);
        verificationY = 237;
    }

    setFill(palette.mint);
    pdf.roundedRect(left, verificationY, contentWidth, 31, 3, 3, 'F');
    setFill([255, 255, 255]);
    pdf.roundedRect(left + 4, verificationY + 4, 23, 23, 2, 2, 'F');
    pdf.addImage(qrDataUrl, 'PNG', left + 5.5, verificationY + 5.5, 20, 20, undefined, 'FAST');
    label('Verifikasi bukti bayar', left + 34, verificationY + 10, palette.green);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    setText(palette.muted);
    const verificationCopy = pdf.splitTextToSize(
        'Scan QR untuk membuka bukti pembayaran resmi dan memastikan detail transaksi masih valid.',
        117,
    ) as string[];
    pdf.text(verificationCopy, left + 34, verificationY + 17, { lineHeightFactor: 1.35 });

    const footerY = 278;
    setDraw(palette.line);
    pdf.line(left, footerY - 8, right, footerY - 8);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    setText(palette.deep);
    pdf.text('Patungan', left, footerY);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    setText(palette.muted);
    pdf.text('Bukti pembayaran resmi | Simpan dokumen ini sebagai arsip pembayaran.', left, footerY + 5);
    pdf.text('Dokumen dibuat otomatis dan dapat diverifikasi melalui QR.', right, footerY + 5, { align: 'right' });

    if (data.note) {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(7);
        setText(palette.muted);
        const note = pdf.splitTextToSize(`Catatan: ${data.note}`, 88) as string[];
        pdf.text(note.slice(0, 2), left + 5, 171, { lineHeightFactor: 1.2 });
    }

    pdf.save(`Bukti-Pembayaran-${safeFilename(data.number)}.pdf`);
}
