import PatunganLayout from '@/layouts/patungan-layout';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { KeyRound, Palette, UserPen, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

const sections: { title: string; url: string; icon: LucideIcon }[] = [
    { title: 'Profil', url: '/settings/profile', icon: UserPen },
    { title: 'Password', url: '/settings/password', icon: KeyRound },
    { title: 'Tampilan', url: '/settings/appearance', icon: Palette },
];

interface SettingsLayoutProps {
    children: ReactNode;
    title: string;
    description: string;
}

export default function SettingsLayout({ children, title, description }: SettingsLayoutProps) {
    const currentPath = new URL(usePage().url, 'http://localhost').pathname;

    return (
        <PatunganLayout
            title={title}
            back={route('profile.index')}
            hero={
                <div>
                    <h1 className="text-brand-deep-foreground text-lg font-bold tracking-tight sm:text-xl">{title}</h1>
                    <p className="text-brand-deep-muted mt-1 text-xs">{description}</p>
                </div>
            }
        >
            {/* Segmented switcher, so the three settings screens feel like one place. */}
            <nav className="border-border bg-card flex gap-1 rounded-2xl border p-1">
                {sections.map((section) => {
                    const active = currentPath === section.url;

                    return (
                        <Link
                            key={section.url}
                            href={section.url}
                            prefetch
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition',
                                active ? 'bg-brand-soft text-primary' : 'text-muted-foreground hover:bg-surface',
                            )}
                        >
                            <section.icon className="size-3.5" />
                            {section.title}
                        </Link>
                    );
                })}
            </nav>

            <div className="mt-3 space-y-3">{children}</div>
        </PatunganLayout>
    );
}

/** Card shell for one block of settings. */
export function SettingsCard({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
    return (
        <section className="border-border bg-card rounded-2xl border p-4">
            <h2 className="text-sm font-bold tracking-tight">{title}</h2>
            {description && <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">{description}</p>}
            <div className="mt-3.5">{children}</div>
        </section>
    );
}
