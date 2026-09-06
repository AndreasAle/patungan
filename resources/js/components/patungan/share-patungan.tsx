import { Button } from '@/components/ui/button';
import { Check, Copy, Share2 } from 'lucide-react';
import { useState } from 'react';

interface SharePatunganProps {
    url: string;
    message: string;
}

export function SharePatungan({ url, message }: SharePatunganProps) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard is unavailable (insecure context) - the link stays selectable below.
            setCopied(false);
        }
    };

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    return (
        <div className="border-border bg-card rounded-2xl border p-4">
            <p className="text-foreground text-sm font-semibold">Bagikan ke grup</p>
            <p className="text-muted-foreground mt-0.5 text-sm">Teman kamu tinggal buka link, pilih nama, bayar QRIS.</p>

            <div className="bg-muted mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5">
                <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">{url}</span>
                <button
                    type="button"
                    onClick={copy}
                    className="text-primary hover:bg-brand-soft inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold transition"
                >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Tersalin' : 'Salin'}
                </button>
            </div>

            <Button asChild className="mt-3 h-11 w-full rounded-xl font-semibold">
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <Share2 className="size-4" />
                    Bagikan ke WhatsApp
                </a>
            </Button>
        </div>
    );
}
