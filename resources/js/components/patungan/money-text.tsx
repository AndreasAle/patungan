import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MoneyTextProps {
    amount: number;
    className?: string;
    /** Visual weight of the figure in its surroundings. */
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
    xl: 'text-3xl',
} as const;

export function MoneyText({ amount, className, size = 'md' }: MoneyTextProps) {
    return <span className={cn('font-semibold tracking-tight tabular-nums', sizes[size], className)}>{rupiah(amount)}</span>;
}
