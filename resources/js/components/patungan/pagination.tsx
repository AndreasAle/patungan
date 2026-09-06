import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    current: number;
    last: number;
    /** Route name to page through, e.g. "transactions.index". */
    routeName: string;
    /** Extra query kept while paging, e.g. an active filter. */
    params?: Record<string, string | number | undefined>;
    className?: string;
}

/**
 * Prev/next paging, shared by every list in the app.
 *
 * Hides itself when there is only one page, so callers do not each repeat the
 * same check.
 */
export function Pagination({ current, last, routeName, params, className }: PaginationProps) {
    if (last <= 1) return null;

    const go = (page: number) => router.get(route(routeName), { ...params, page }, { preserveScroll: true, preserveState: true });

    return (
        <nav className={cn('flex items-center justify-center gap-2', className)} aria-label="Halaman">
            <button
                type="button"
                onClick={() => go(current - 1)}
                disabled={current === 1}
                aria-label="Halaman sebelumnya"
                className="border-border text-foreground hover:bg-surface flex size-10 items-center justify-center rounded-full border transition disabled:opacity-30"
            >
                <ChevronLeft className="size-4" />
            </button>

            <span className="text-muted-foreground px-2 text-xs font-semibold tabular-nums">
                {current} / {last}
            </span>

            <button
                type="button"
                onClick={() => go(current + 1)}
                disabled={current === last}
                aria-label="Halaman berikutnya"
                className="border-border text-foreground hover:bg-surface flex size-10 items-center justify-center rounded-full border transition disabled:opacity-30"
            >
                <ChevronRight className="size-4" />
            </button>
        </nav>
    );
}
