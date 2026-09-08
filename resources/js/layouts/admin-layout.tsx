import AppLogo from '@/components/app-logo';
import { FlashToast } from '@/components/patungan/flash-toast';
import { cn } from '@/lib/utils';
import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

const tabs = [
    { label: 'Ringkasan', href: 'admin.dashboard', path: '/admin' },
    { label: 'Users', href: 'admin.users', path: '/admin/users' },
    { label: 'Patungan', href: 'admin.patungans', path: '/admin/patungans' },
    { label: 'Payments', href: 'admin.payments', path: '/admin/payments' },
    { label: 'Pencairan', href: 'admin.settlements', path: '/admin/settlements' },
    { label: 'Webhook', href: 'admin.webhooks', path: '/admin/webhooks' },
    { label: 'Bantuan', href: 'admin.support', path: '/admin/bantuan' },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = new URL(usePage().url, 'http://localhost').pathname;

    return (
        <div className="bg-background min-h-screen">
            <FlashToast />

            <header className="border-border bg-card border-b">
                <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 lg:px-8">
                    <div className="flex items-center gap-3">
                        <AppLogo showWordmark={false} />
                        <span className="font-bold tracking-tight">Admin</span>
                    </div>

                    <Link
                        href={route('dashboard')}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm font-medium"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali ke app
                    </Link>
                </div>

                <nav className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 pb-2 lg:px-8">
                    {tabs.map((tab) => {
                        const active = tab.path === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.path);

                        return (
                            <Link
                                key={tab.href}
                                href={route(tab.href)}
                                className={cn(
                                    'rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition',
                                    active ? 'bg-brand-soft text-primary' : 'text-muted-foreground hover:bg-muted',
                                )}
                            >
                                {tab.label}
                            </Link>
                        );
                    })}
                </nav>
            </header>

            <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
        </div>
    );
}
