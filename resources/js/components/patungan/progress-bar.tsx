import { percentage } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number;
    total: number;
    className?: string;
    tone?: 'brand' | 'success';
}

export function ProgressBar({ value, total, className, tone = 'brand' }: ProgressBarProps) {
    const percent = percentage(value, total);

    return (
        <div
            className={cn('bg-muted h-2 w-full overflow-hidden rounded-full', className)}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div
                className={cn('h-full rounded-full transition-[width] duration-500 ease-out', tone === 'success' ? 'bg-success' : 'bg-primary')}
                style={{ width: `${percent}%` }}
            />
        </div>
    );
}
