import { Button } from '@/components/ui/button';
import { rupiah } from '@/lib/format';
import type { OrganizerParticipant } from '@/types';
import { Check, Copy, Eye, EyeOff, Share2 } from 'lucide-react';
import { useState } from 'react';

interface ShareRoomInviteProps {
    participant: OrganizerParticipant;
    patunganTitle: string;
    publicUrl: string;
    organizerName: string;
}

/**
 * One vendor, one invite. Copies the link and their own PIN together so the
 * organizer can paste a complete message straight into a chat.
 */
export function ShareRoomInvite({ participant, patunganTitle, publicUrl, organizerName }: ShareRoomInviteProps) {
    const [copied, setCopied] = useState(false);
    const [revealed, setRevealed] = useState(false);

    if (!participant.access_pin) return null;

    const message = [
        `Halo ${participant.name},`,
        '',
        `Berikut tagihan untuk ${patunganTitle} sebesar ${rupiah(participant.amount_due)}.`,
        '',
        `Link pembayaran: ${publicUrl}`,
        `PIN kamu: ${participant.access_pin}`,
        '',
        'Buka linknya, masukkan PIN di atas, lalu bayar pakai QRIS. Kamu hanya akan melihat tagihan kamu sendiri.',
        '',
        organizerName,
    ].join('\n');

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2500);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="bg-surface mt-2.5 rounded-xl p-3">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-muted-foreground text-[10px]">PIN akses</p>
                    <p className="text-sm font-bold tracking-[0.2em] tabular-nums">{revealed ? participant.access_pin : '••••••'}</p>
                </div>

                <button
                    type="button"
                    onClick={() => setRevealed(!revealed)}
                    aria-label={revealed ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
                    className="text-muted-foreground hover:text-foreground rounded-lg p-1.5 transition"
                >
                    {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="h-9 rounded-lg text-[11px] font-semibold" onClick={copy}>
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Tersalin' : 'Salin undangan'}
                </Button>
                <Button asChild size="sm" className="h-9 rounded-lg text-[11px] font-semibold">
                    <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                        <Share2 className="size-3.5" />
                        WhatsApp
                    </a>
                </Button>
            </div>
        </div>
    );
}
