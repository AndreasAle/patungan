import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

/** A phone frame for the small product shots dotted through the landing page. */
export function PhoneMockup({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn('bg-foreground/90 rounded-[2rem] p-2 shadow-xl', className)}>
            <div className="bg-card relative overflow-hidden rounded-[1.6rem]">
                <div className="bg-foreground/90 absolute top-0 left-1/2 z-10 h-4 w-20 -translate-x-1/2 rounded-b-xl" />
                {children}
            </div>
        </div>
    );
}
