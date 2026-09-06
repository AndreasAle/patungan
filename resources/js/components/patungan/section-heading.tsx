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

interface PageHeaderProps {
    eyebrow: string;
    title: string;
    description?: string;
    /** Rendered on the right, e.g. a primary button. */
    action?: ReactNode;
    className?: string;
}

/**
 * The top of a page: the same eyebrow, rule and display type the landing page
 * opens its sections with, so the app does not change voice at the login wall.
 */
export function PageHeader({ eyebrow, title, description, action, className }: PageHeaderProps) {
    return (
        <div className={cn('flex items-end justify-between gap-4', className)}>
            <div className="min-w-0">
                <Eyebrow>{eyebrow}</Eyebrow>
                <h1 className="display mt-2.5 text-[22px] sm:text-3xl">{title}</h1>
                {description && <p className="text-muted-foreground mt-2 max-w-md text-xs leading-relaxed sm:text-sm">{description}</p>}
            </div>

            {action && <div className="shrink-0 pb-1">{action}</div>}
        </div>
    );
}

/** The quiet uppercase label that titles a card or a panel. */
export function PanelHeading({ children, className }: { children: ReactNode; className?: string }) {
    return <h2 className={cn('text-muted-foreground text-[11px] font-bold tracking-[0.18em] uppercase', className)}>{children}</h2>;
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
