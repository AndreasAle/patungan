import AppLogo from '@/components/app-logo';
import { FlashToast } from '@/components/patungan/flash-toast';
import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

/**
 * Chrome for share links and the payment page: no navigation, nothing to sign
 * into, nothing that pulls the payer away from finishing.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <div className="bg-background min-h-screen">
            <FlashToast />

            <header className="border-border bg-background/90 flex h-14 items-center justify-center border-b px-4 backdrop-blur">
                <Link href="/" aria-label="Patungan">
                    <AppLogo />
                </Link>
            </header>

            <main className="mx-auto w-full max-w-lg px-4 py-5 pb-12">{children}</main>

            <footer className="text-muted-foreground pb-8 text-center text-xs">
                Ditenagai <span className="text-foreground font-semibold">Patungan</span> · Bayar bagianmu, beres.
            </footer>
        </div>
    );
}
