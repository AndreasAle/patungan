import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

interface RailProps {
    children: ReactNode;
    /** Rendered beside the arrows, so the header and controls share a line. */
    header: ReactNode;
    className?: string;
}

/**
 * One row of cards that scrolls sideways.
 *
 * The next card is always partly visible so it is obvious there is more, and on
 * pointer devices the arrows page through it. Arrows hide themselves when there
 * is nothing left to scroll.
 */
export function Rail({ children, header, className }: RailProps) {
    const track = useRef<HTMLDivElement>(null);
    const [atStart, setAtStart] = useState(true);
    const [atEnd, setAtEnd] = useState(false);

    const sync = () => {
        const el = track.current;

        if (!el) return;

        setAtStart(el.scrollLeft <= 8);
        setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    };

    useEffect(() => {
        sync();

        const el = track.current;

        if (!el) return;

        const observer = new ResizeObserver(sync);
        observer.observe(el);

        return () => observer.disconnect();
    }, []);

    const page = (direction: 1 | -1) => {
        const el = track.current;

        if (!el) return;

        el.scrollBy({ left: direction * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
    };

    return (
        <div className={className}>
            <div className="flex items-end justify-between gap-6">
                <div className="min-w-0">{header}</div>

                <div className="hidden shrink-0 gap-2 md:flex">
                    {(
                        [
                            [-1, ChevronLeft, atStart, 'Geser ke kiri'],
                            [1, ChevronRight, atEnd, 'Geser ke kanan'],
                        ] as const
                    ).map(([direction, Icon, disabled, label]) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => page(direction)}
                            disabled={disabled}
                            aria-label={label}
                            className="border-border text-foreground hover:bg-surface flex size-10 items-center justify-center rounded-full border transition disabled:opacity-30"
                        >
                            <Icon className="size-4" />
                        </button>
                    ))}
                </div>
            </div>

            {/* Bleed to the screen edge so the row reads as a rail, not a boxed grid. */}
            <div
                ref={track}
                onScroll={sync}
                className={cn(
                    'rail -mx-4 mt-6 px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8',
                    // Fade the trailing edge, but only while there is more to see.
                    !atEnd && '[mask-image:linear-gradient(to_right,black_88%,transparent)]',
                )}
            >
                {children}
            </div>
        </div>
    );
}
