import { MoneyText } from '@/components/patungan/money-text';
import { cn } from '@/lib/utils';

interface DashboardStatProps {
    label: string;
    amount: number;
    hint?: string;
    emphasis?: boolean;
    className?: string;
}

export function DashboardStat({ label, amount, hint, emphasis = false, className }: DashboardStatProps) {
    return (
        <div className={cn('border-border bg-card rounded-2xl border p-4', className)}>
            <p className="text-muted-foreground text-sm">{label}</p>
            <MoneyText amount={amount} size={emphasis ? 'xl' : 'lg'} className={cn('mt-1 block', emphasis && 'text-primary')} />
            {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
        </div>
    );
}
