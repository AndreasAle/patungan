import { Button } from '@/components/ui/button';
import { formatTime, rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PublicParticipant } from '@/types';
import { Link } from '@inertiajs/react';
import { Check, ReceiptText } from 'lucide-react';

interface ParticipantRowProps {
    participant: PublicParticipant;
    /** Omitted when the patungan no longer accepts payments. */
    onPay?: (participant: PublicParticipant) => void;
    disabled?: boolean;
}

export function ParticipantRow({ participant, onPay, disabled = false }: ParticipantRowProps) {
    const paid = participant.is_paid;

    return (
        <li
            className={cn(
                'flex items-center gap-3 rounded-2xl border px-3.5 py-3 transition',
                paid ? 'border-success/20 bg-success-soft/50' : 'border-border bg-card',
            )}
        >
            <span
                className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                    paid ? 'bg-success text-success-foreground' : 'bg-brand-soft text-primary',
                )}
                aria-hidden="true"
            >
                {paid ? <Check className="size-4" strokeWidth={3} /> : participant.name.charAt(0).toUpperCase()}
            </span>

            <div className="min-w-0 flex-1">
                <p className="text-foreground truncate text-sm font-semibold">{participant.name}</p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {rupiah(participant.amount_due)}
                    {paid && participant.paid_at && ` · ${formatTime(participant.paid_at)}`}
                    {!paid && participant.note && ` · ${participant.note}`}
                </p>
            </div>

            {paid ? (
                participant.invoice_url ? (
                    /* A settled share always has a receipt to open. */
                    <Link
                        href={participant.invoice_url}
                        className="text-success border-success/30 hover:bg-success/10 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition"
                    >
                        <ReceiptText className="size-3.5" />
                        Invoice
                    </Link>
                ) : (
                    <span className="text-success shrink-0 text-xs font-semibold">Sudah bayar</span>
                )
            ) : (
                <Button
                    size="sm"
                    className="h-9 shrink-0 rounded-xl px-4 text-xs font-semibold"
                    onClick={() => onPay?.(participant)}
                    disabled={disabled || !onPay}
                >
                    Bayar
                </Button>
            )}
        </li>
    );
}
