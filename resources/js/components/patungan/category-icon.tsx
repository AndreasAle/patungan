import { cn } from '@/lib/utils';
import { CalendarDays, Car, Coffee, Gift, Home, PartyPopper, PiggyBank, Trophy, UtensilsCrossed, type LucideIcon } from 'lucide-react';

/** One consistent Lucide glyph per category - no emoji in the product chrome. */
const icons: Record<string, LucideIcon> = {
    OLAHRAGA: Trophy,
    MAKAN: UtensilsCrossed,
    NONGKRONG: Coffee,
    TRIP: Car,
    VILLA: Home,
    KADO: Gift,
    ACARA: PartyPopper,
    KAS: PiggyBank,
    LAINNYA: CalendarDays,
};

interface CategoryIconProps {
    category: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const boxes = {
    sm: 'size-9 rounded-xl',
    md: 'size-11 rounded-2xl',
    lg: 'size-14 rounded-2xl',
} as const;

const glyphs = { sm: 'size-4', md: 'size-5', lg: 'size-6' } as const;

export function CategoryIcon({ category, className, size = 'md' }: CategoryIconProps) {
    const Icon = icons[category] ?? CalendarDays;

    return (
        <span className={cn('bg-brand-soft text-primary flex shrink-0 items-center justify-center', boxes[size], className)}>
            <Icon className={glyphs[size]} strokeWidth={2.2} />
        </span>
    );
}
