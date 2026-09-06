import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

interface AppLogoProps {
    className?: string;
    showWordmark?: boolean;
    /** "onDeep" inverts the wordmark for the dark green surfaces. */
    tone?: 'default' | 'onDeep';
    size?: 'sm' | 'md';
}

const marks = { sm: 'size-6', md: 'size-7' } as const;
const words = { sm: 'text-sm', md: 'text-base' } as const;

export default function AppLogo({ className, showWordmark = true, tone = 'default', size = 'md' }: AppLogoProps) {
    return (
        <span className={cn('flex items-center gap-2', className)}>
            <AppLogoIcon className={marks[size]} />
            {showWordmark && (
                <span
                    className={cn(
                        'font-extrabold tracking-[-0.02em]',
                        words[size],
                        tone === 'onDeep' ? 'text-brand-deep-foreground' : 'text-primary',
                    )}
                >
                    Patungan
                </span>
            )}
        </span>
    );
}
