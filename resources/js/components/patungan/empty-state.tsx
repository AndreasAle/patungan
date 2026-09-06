import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
    return (
        <div className={cn('border-border bg-card flex flex-col items-center rounded-2xl border border-dashed px-5 py-8 text-center', className)}>
            <span className="bg-brand-soft text-primary flex size-10 items-center justify-center rounded-xl">
                <Icon className="size-[18px]" />
            </span>
            <p className="text-foreground mt-3 text-sm font-semibold">{title}</p>
            {description && <p className="text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
