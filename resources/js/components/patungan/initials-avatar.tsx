import { cn } from '@/lib/utils';

const sizes = {
    sm: 'size-9 text-xs',
    md: 'size-12 text-sm',
    lg: 'size-16 text-lg',
} as const;

interface InitialsAvatarProps {
    name: string;
    className?: string;
    size?: keyof typeof sizes;
    tone?: 'brand' | 'onDeep';
}

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);

    return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

export function InitialsAvatar({ name, className, size = 'md', tone = 'brand' }: InitialsAvatarProps) {
    return (
        <span
            aria-hidden="true"
            className={cn(
                'flex shrink-0 items-center justify-center rounded-full font-bold tracking-tight',
                tone === 'onDeep' ? 'text-lime bg-white/12 ring-2 ring-white/15' : 'bg-brand-soft text-primary',
                sizes[size],
                className,
            )}
        >
            {initials(name)}
        </span>
    );
}
