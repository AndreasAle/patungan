import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * Left-aligned section label with a hairline rule - never a centred pill.
 *
 * Shared with the landing page so a section on the dashboard is labelled the
 * same way as a section on the marketing site.
 */
export function Eyebrow({ children, onDeep = false, className }: { children: ReactNode; onDeep?: boolean; className?: string }) {
    return (
        <p
            className={cn(
                'flex items-center gap-2.5 text-[11px] font-bold tracking-[0.18em] uppercase',
                onDeep ? 'text-lime' : 'text-primary',
                className,
            )}
        >
            <span className={cn('h-px w-6', onDeep ? 'bg-lime/60' : 'bg-primary/40')} />
            {children}
        </p>
    );
}

interface SectionHeadingProps {
    eyebrow: string;
    title: string;
    /** Optional link on the right, e.g. "Lihat semua". */
    action?: { label: string; href: string };
    className?: string;
}

export function SectionHeading({ eyebrow, title, action, className }: SectionHeadingProps) {
    return (
        <div className={cn('flex items-end justify-between gap-4', className)}>
            <div className="min-w-0">
                <Eyebrow>{eyebrow}</Eyebrow>
                <h2 className="display mt-2.5 text-lg sm:text-2xl">{title}</h2>
            </div>

            {action && (
                <Link
                    href={action.href}
                    className="text-foreground group inline-flex shrink-0 items-center gap-1 pb-1 text-xs font-semibold whitespace-nowrap"
                >
                    {action.label}
                    <ArrowUpRight className="size-3.5 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
            )}
        </div>
    );
}
