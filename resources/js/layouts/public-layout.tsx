import AppLogo from '@/components/app-logo';
import { FlashToast } from '@/components/patungan/flash-toast';
import { HelpBubble } from '@/components/patungan/help-bubble';
import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

/**
 * Chrome for share links, payment and receipts: no navigation, nothing to sign
 * into, nothing that pulls the payer away from finishing.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
    return (
        <div className="bg-background flex min-h-screen flex-col">
            <FlashToast />

            <header className="border-border bg-card/90 flex h-13 items-center justify-center border-b py-3 backdrop-blur print:hidden">
                <Link href="/" aria-label="Patungan">
                    <AppLogo />
                </Link>
            </header>

            {/*
                The bottom padding clears the help bubble, which floats above
                this content. Without it the bubble sits on top of the last
                row's Bayar button - and on a list of participants the last row
                is exactly where somebody scrolling to find their own name ends
                up.
            */}
            <main className="mx-auto w-full max-w-md flex-1 px-4 pt-4 pb-24 sm:max-w-lg">{children}</main>

            {/*
                A payer deciding whether to trust this page with their money
                should be able to read the terms from the page itself, not have
                to go hunting on the marketing site for them.
            */}
            <footer className="text-muted-foreground px-4 py-6 text-center text-[11px] print:hidden">
                <p>
                    Ditenagai <span className="text-foreground font-semibold">Patungan</span> · Bayar bagianmu, beres.
                </p>
                <p className="mt-2 flex items-center justify-center gap-3">
                    <a href={route('legal.privacy')} className="hover:text-foreground transition">
                        Privasi
                    </a>
                    <span aria-hidden="true">·</span>
                    <a href={route('legal.terms')} className="hover:text-foreground transition">
                        Syarat
                    </a>
                </p>
            </footer>

            {/* A payer with a QRIS that will not settle has no other way to reach anyone. */}
            <HelpBubble />
        </div>
    );
}
