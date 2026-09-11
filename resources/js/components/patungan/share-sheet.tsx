import { BottomSheet } from '@/components/patungan/bottom-sheet';
import { Button } from '@/components/ui/button';
import { copyText, shareMessage } from '@/lib/share';
import { cn } from '@/lib/utils';
import { Check, Copy, Send } from 'lucide-react';
import { useState } from 'react';

interface ShareSheetProps {
    open: boolean;
    onClose: () => void;
    title: string;
    /** The composed text, or null when there is nothing worth sending. */
    message: string | null;
    /** Shown instead of the message when it is null. */
    emptyTitle?: string;
    emptyBody?: string;
    /** Called once the message has actually been handed to WhatsApp. */
    onShared?: () => void;
}

/**
 * Shows the exact message before it is sent.
 *
 * The preview is the point. These messages go into a group of the organizer's
 * friends and name people who have not paid, so the organizer reads the words
 * first and decides. Nothing is ever sent without that step.
 */
export function ShareSheet({ open, onClose, title, message, emptyTitle, emptyBody, onShared }: ShareSheetProps) {
    const [copied, setCopied] = useState(false);

    const send = async () => {
        if (!message) return;

        if (await shareMessage(message)) {
            onShared?.();
            onClose();
        }
    };

    const copy = async () => {
        if (!message) return;

        setCopied(await copyText(message));
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <BottomSheet open={open} onOpenChange={(next) => !next && onClose()} title={title}>
            {message === null ? (
                <div className="py-6 text-center">
                    <span className="bg-success-soft text-success mx-auto flex size-12 items-center justify-center rounded-2xl text-2xl">🎉</span>
                    <p className="mt-4 text-sm font-bold tracking-tight">{emptyTitle ?? 'Semua sudah bayar 🎉'}</p>
                    <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{emptyBody ?? 'Nggak ada yang perlu ditagih lagi.'}</p>
                    <Button variant="outline" className="mt-5 h-11 rounded-full px-6 text-sm font-semibold" onClick={onClose}>
                        Tutup
                    </Button>
                </div>
            ) : (
                <>
                    <p className="text-muted-foreground text-xs">Cek dulu pesannya, baru kirim.</p>

                    <div className="bg-muted mt-3 max-h-64 overflow-y-auto rounded-2xl px-4 py-3.5">
                        <p className="text-foreground text-sm leading-relaxed whitespace-pre-line">{message}</p>
                    </div>

                    <Button onClick={send} className="mt-4 h-12 w-full rounded-full text-sm font-semibold">
                        <Send className="size-4" />
                        Kirim ke WhatsApp
                    </Button>

                    <button
                        type="button"
                        onClick={copy}
                        className={cn(
                            'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition',
                            copied ? 'text-success' : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                        {copied ? 'Pesan tersalin' : 'Salin pesan'}
                    </button>
                </>
            )}
        </BottomSheet>
    );
}
