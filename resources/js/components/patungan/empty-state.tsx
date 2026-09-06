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
        <div className={cn('border-border bg-card flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center', className)}>
            <span className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-2xl">
                <Icon className="size-5" />
            </span>
            <p className="text-foreground mt-4 font-semibold">{title}</p>
            {description && <p className="text-muted-foreground mt-1 max-w-sm text-sm">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}
