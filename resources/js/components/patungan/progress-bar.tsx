import { percentage } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
    value: number;
    total: number;
    className?: string;
    /** "onDeep" is for the dark green panels, where the track needs to lighten. */
    tone?: 'lime' | 'success' | 'onDeep';
}

const fills = {
    lime: 'bg-lime',
    success: 'bg-success',
    onDeep: 'bg-lime',
} as const;

export function ProgressBar({ value, total, className, tone = 'lime' }: ProgressBarProps) {
    const percent = percentage(value, total);

    return (
        <div
            className={cn('h-2 w-full overflow-hidden rounded-full', tone === 'onDeep' ? 'bg-white/15' : 'bg-muted', className)}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', fills[tone])} style={{ width: `${percent}%` }} />
        </div>
    );
}
