import { MoneyText } from '@/components/patungan/money-text';
import { Button } from '@/components/ui/button';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PublicParticipant } from '@/types';
import { Check } from 'lucide-react';

interface ParticipantRowProps {
    participant: PublicParticipant;
    /** Omitted on a closed patungan, where nobody can pay any more. */
    onPay?: (participant: PublicParticipant) => void;
    disabled?: boolean;
}

export function ParticipantRow({ participant, onPay, disabled = false }: ParticipantRowProps) {
    const paid = participant.is_paid;

    return (
        <li
            className={cn(
                'border-border bg-card flex items-center gap-3 rounded-2xl border px-4 py-3 transition',
                paid && 'bg-success-soft/50 border-transparent opacity-70',
            )}
        >
            <div className="min-w-0 flex-1">
                <p className="text-foreground truncate font-semibold">{participant.name}</p>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-sm">
                    <MoneyText amount={participant.amount_due} size="sm" className="text-muted-foreground font-medium" />
                    {participant.note && <span className="truncate">· {participant.note}</span>}
                </div>
            </div>

            {paid ? (
                <span className="bg-success-soft text-success inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold">
                    <Check className="size-4" strokeWidth={3} />
                    Sudah bayar
                    {participant.paid_at && <span className="hidden font-normal opacity-70 sm:inline">{formatTime(participant.paid_at)}</span>}
                </span>
            ) : (
                <Button size="sm" className="h-10 rounded-xl px-5 font-semibold" onClick={() => onPay?.(participant)} disabled={disabled || !onPay}>
                    Bayar
                </Button>
            )}
        </li>
    );
}
