import { cn } from '@/lib/utils';

type Tone = 'success' | 'pending' | 'neutral' | 'danger' | 'brand';

const tones: Record<Tone, string> = {
    success: 'bg-success-soft text-success',
    pending: 'bg-warning-soft text-warning',
    neutral: 'bg-muted text-muted-foreground',
    danger: 'bg-destructive/10 text-destructive',
    brand: 'bg-brand-soft text-primary',
};

/** Maps every backend status string onto one of five visual tones. */
const statusTones: Record<string, Tone> = {
    PAID: 'success',
    COMPLETED: 'success',
    ACTIVE: 'brand',
    PENDING: 'pending',
    PROCESSING: 'pending',
    DRAFT: 'neutral',
    UNPAID: 'neutral',
    CLOSED: 'neutral',
    WAIVED: 'neutral',
    EXPIRED: 'neutral',
    CANCELLED: 'neutral',
    REFUNDED: 'neutral',
    FAILED: 'danger',
    REJECTED: 'danger',
};

interface StatusBadgeProps {
    status: string;
    label: string;
    className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
    const tone = statusTones[status] ?? 'neutral';

    return (
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap', tones[tone], className)}>
            {label}
        </span>
    );
}
