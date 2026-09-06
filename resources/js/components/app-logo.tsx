import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';

export default function AppLogo({ className, showWordmark = true }: { className?: string; showWordmark?: boolean }) {
    return (
        <span className={cn('flex items-center gap-2.5', className)}>
            <AppLogoIcon className="text-primary size-8" />
            {showWordmark && <span className="text-foreground text-lg font-extrabold tracking-tight">Patungan</span>}
        </span>
    );
}
