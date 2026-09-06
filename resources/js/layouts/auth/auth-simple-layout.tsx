import AppLogo from '@/components/app-logo';
import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
    children: ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background flex min-h-svh flex-col">
            {/* A slim brand band so the auth screens feel part of the app. */}
            <header className="surface-deep flex h-14 shrink-0 items-center justify-center">
                <Link href={route('home')} aria-label="Patungan">
                    <AppLogo tone="onDeep" />
                </Link>
            </header>

            <main className="flex flex-1 items-center justify-center px-4 py-8">
                <div className="w-full max-w-sm">
                    <div className="border-border bg-card rounded-3xl border p-6 shadow-[0_8px_40px_rgba(16,66,44,0.06)]">
                        <h1 className="text-foreground text-xl font-extrabold tracking-tight">{title}</h1>
                        {description && <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{description}</p>}

                        <div className="mt-5">{children}</div>
                    </div>

                    <p className="text-muted-foreground mt-5 text-center text-[11px] leading-relaxed">
                        Dengan lanjut, kamu setuju memakai Patungan secara wajar.
                    </p>
                </div>
            </main>
        </div>
    );
}
