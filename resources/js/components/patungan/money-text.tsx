import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';

interface MoneyTextProps {
    amount: number;
    className?: string;
    /** Sized for phones first; the larger steps only grow on wider screens. */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg sm:text-xl',
    xl: 'text-[28px] leading-none sm:text-4xl',
} as const;

export function MoneyText({ amount, className, size = 'md' }: MoneyTextProps) {
    return <span className={cn('font-semibold tracking-tight tabular-nums', sizes[size], className)}>{rupiah(amount)}</span>;
}
