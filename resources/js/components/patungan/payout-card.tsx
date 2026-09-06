import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Landmark, Star, Trash2 } from 'lucide-react';

export interface PayoutDestinationItem {
    id: number;
    type: string;
    label: string;
    account_holder: string;
    is_default: boolean;
}

interface PayoutCardProps {
    destination: PayoutDestinationItem;
    onMakeDefault: (id: number) => void;
    onRemove: (id: number) => void;
}

export function PayoutCard({ destination, onMakeDefault, onRemove }: PayoutCardProps) {
    return (
        <div className={cn('bg-card flex items-center gap-3 rounded-2xl border p-4', destination.is_default ? 'border-primary/40' : 'border-border')}>
            <span className="bg-brand-soft text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                <Landmark className="size-5" />
            </span>

            <div className="min-w-0 flex-1">
                <p className="text-foreground truncate font-semibold">{destination.label}</p>
                <p className="text-muted-foreground truncate text-sm">{destination.account_holder}</p>
            </div>

            {destination.is_default ? (
                <span className="bg-brand-soft text-primary inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
                    <Star className="size-3" />
                    Utama
                </span>
            ) : (
                <Button variant="ghost" size="sm" onClick={() => onMakeDefault(destination.id)}>
                    Jadikan utama
                </Button>
            )}

            <Button
                variant="ghost"
                size="icon"
                aria-label={`Hapus ${destination.label}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => onRemove(destination.id)}
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    );
}
