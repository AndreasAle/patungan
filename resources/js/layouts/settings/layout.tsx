import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';

const sections = [
    { title: 'Profil', url: '/settings/profile' },
    { title: 'Password', url: '/settings/password' },
    { title: 'Tampilan', url: '/settings/appearance' },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
    const currentPath = new URL(usePage().url, 'http://localhost').pathname;

    return (
        <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Pengaturan</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">Atur profil dan akun kamu.</p>

            <div className="mt-6 flex flex-col lg:flex-row lg:gap-12">
                <nav className="flex gap-1 lg:w-48 lg:flex-col">
                    {sections.map((section) => (
                        <Button
                            key={section.url}
                            size="sm"
                            variant="ghost"
                            asChild
                            className={cn('justify-start', { 'bg-muted': currentPath === section.url })}
                        >
                            <Link href={section.url} prefetch>
                                {section.title}
                            </Link>
                        </Button>
                    ))}
                </nav>

                <Separator className="my-6 lg:hidden" />

                <section className="max-w-xl flex-1 space-y-10">{children}</section>
            </div>
        </div>
    );
}
