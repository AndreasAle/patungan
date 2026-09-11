import AppLogo from '@/components/app-logo';
import { HelpBubble } from '@/components/patungan/help-bubble';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * The shell both legal pages sit in.
 *
 * Deliberately plain: a wide measure and generous line height, no cards, no
 * accent panels. These pages exist to be read and, occasionally, to be read
 * closely by somebody deciding whether to trust the product with their money.
 * Decoration would work against that.
 */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
    return (
        <div className="bg-background min-h-screen">
            <Head title={title} />

            <header className="border-border border-b">
                <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4">
                    <Link href={route('home')}>
                        <AppLogo />
                    </Link>
                    <Link
                        href={route('home')}
                        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-semibold transition"
                    >
                        <ArrowLeft className="size-4" />
                        Kembali
                    </Link>
                </div>
            </header>

            <main className="mx-auto w-full max-w-3xl px-5 py-10 pb-24">
                <h1 className="display text-2xl sm:text-3xl">{title}</h1>
                <p className="text-muted-foreground mt-2 text-xs">Terakhir diperbarui {updated}</p>

                <div className="mt-9 space-y-9">{children}</div>

                <p className="border-border text-muted-foreground mt-12 border-t pt-6 text-xs leading-relaxed">
                    Ada yang kurang jelas? Hubungi{' '}
                    <a href="mailto:patungan@trackertask.com" className="text-primary font-semibold">
                        patungan@trackertask.com
                    </a>
                    .
                </p>
            </main>

            <HelpBubble />
        </div>
    );
}

/** One numbered section. */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
    return (
        <section>
            <h2 className="text-base font-bold tracking-tight sm:text-lg">{heading}</h2>
            <div className="text-muted-foreground mt-3 space-y-3 text-sm leading-relaxed">{children}</div>
        </section>
    );
}

/** A bulleted list inside a section. */
export function Points({ items }: { items: ReactNode[] }) {
    return (
        <ul className="mt-3 space-y-2">
            {items.map((item, index) => (
                <li key={index} className="flex gap-2.5">
                    <span className="bg-primary/50 mt-[0.6em] size-1 shrink-0 rounded-full" aria-hidden="true" />
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

/** Something the reader should not miss. */
export function Notice({ children }: { children: ReactNode }) {
    return <p className="border-warning/30 bg-warning-soft text-foreground mt-4 rounded-2xl border px-4 py-3 text-sm leading-relaxed">{children}</p>;
}
