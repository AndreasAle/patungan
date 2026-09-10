import { ShareSheet } from '@/components/patungan/share-sheet';
import { Button } from '@/components/ui/button';
import { copyText, shareMessage } from '@/lib/share';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { BellRing, Check, Copy, Share2, TrendingUp, Users } from 'lucide-react';
import { useState } from 'react';

export interface ShareBundle {
    public_url: string;
    invite: string;
    progress: string;
    /** Null when nobody is left to chase. */
    reminder: string | null;
    remindable: string[];
}

/**
 * The action block at the top of a patungan.
 *
 * One dominant button, because there is one thing an organizer does with a
 * patungan more often than everything else combined: put it back in the group
 * chat. Reminding, sharing progress and copying the link sit underneath as
 * equals, and settings are not here at all - editing a patungan is rare, and
 * giving it a primary button would push the common action down the page.
 */
export function PatunganActions({ uuid, share, className }: { uuid: string; share: ShareBundle; className?: string }) {
    const [sheet, setSheet] = useState<'reminder' | 'progress' | null>(null);
    const [copied, setCopied] = useState(false);

    const record = (type: string, channel = 'whatsapp') => {
        router.post(route('share.record', uuid), { type, channel }, { preserveState: true, preserveScroll: true, only: [] });
    };

    const shareInvite = async () => {
        if (await shareMessage(share.invite)) {
            record('GROUP_INVITE');
        }
    };

    const copyLink = async () => {
        const didCopy = await copyText(share.public_url);
        setCopied(didCopy);
        if (didCopy) record('GROUP_INVITE', 'clipboard');
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={cn('border-border bg-card rounded-3xl border p-4', className)}>
            <Button onClick={shareInvite} className="h-13 w-full rounded-2xl text-sm font-bold">
                <Users className="size-5" />
                Bagikan ke Grup
            </Button>

            <div className="mt-2.5 grid grid-cols-3 gap-2">
                <SecondaryAction icon={BellRing} label="Tagih" onClick={() => setSheet('reminder')} />
                <SecondaryAction icon={TrendingUp} label="Progress" onClick={() => setSheet('progress')} />
                <SecondaryAction
                    icon={copied ? Check : Copy}
                    label={copied ? 'Tersalin' : 'Salin link'}
                    onClick={copyLink}
                    tone={copied ? 'success' : 'default'}
                />
            </div>

            <div className="bg-muted mt-3 flex items-center gap-2 rounded-2xl px-3 py-2.5">
                <Share2 className="text-muted-foreground size-3.5 shrink-0" />
                <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px]">{share.public_url}</span>
            </div>

            <ShareSheet
                open={sheet === 'reminder'}
                onClose={() => setSheet(null)}
                title="Tagih yang belum bayar"
                message={share.reminder}
                emptyTitle="Semua sudah bayar 🎉"
                emptyBody="Nggak ada yang perlu ditagih lagi."
                onShared={() => record('UNPAID_REMINDER')}
            />

            <ShareSheet
                open={sheet === 'progress'}
                onClose={() => setSheet(null)}
                title="Bagikan progress"
                message={share.progress}
                onShared={() => record('PROGRESS')}
            />
        </div>
    );
}

function SecondaryAction({
    icon: Icon,
    label,
    onClick,
    tone = 'default',
}: {
    icon: typeof BellRing;
    label: string;
    onClick: () => void;
    tone?: 'default' | 'success';
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'bg-muted hover:bg-accent flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[11px] font-semibold transition active:scale-[0.98]',
                tone === 'success' ? 'text-success' : 'text-foreground',
            )}
        >
            <Icon className="size-4" />
            {label}
        </button>
    );
}
