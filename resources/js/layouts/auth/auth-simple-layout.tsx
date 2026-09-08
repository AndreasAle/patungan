import AppLogo from '@/components/app-logo';
import { Eyebrow } from '@/components/patungan/section-heading';
import { Link } from '@inertiajs/react';
import { Lock, QrCode, UserRoundCheck } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
    children: ReactNode;
    name?: string;
    title?: string;
    description?: string;
}

/**
 * The two-column shell every auth screen sits in.
 *
 * A form floating on an empty page gave no sense of what the account is for,
 * so on wide screens the left half carries the product: brand photography
 * under a deep green scrim, with the three things that are actually true about
 * paying through Patungan. Phones get the form alone - the panel is decoration
 * there, and decoration should not cost a payer their data allowance.
 */

/** Claims kept to what the product genuinely does. */
const promises = [
    { icon: UserRoundCheck, title: 'Tanpa daftar buat yang bayar', body: 'Teman kamu cukup buka link, cari namanya, lalu bayar.' },
    { icon: QrCode, title: 'Bayar pakai QRIS', body: 'Satu kode untuk semua e-wallet dan mobile banking.' },
    { icon: Lock, title: 'Nominal dikunci server', body: 'Yang bayar tidak bisa mengubah angkanya. Selalu dibaca dari database.' },
];

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="bg-background min-h-svh lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            {/* Brand panel - wide screens only. */}
            <aside className="surface-deep relative hidden lg:flex lg:flex-col lg:justify-between lg:overflow-hidden lg:p-10 xl:p-12">
                {/*
                  This shot rather than the cafe or friends ones: those carry their
                  own baked-in headline, which fought the display type below. Here
                  the only lettering is gym signage in the background, and the
                  subject is the product actually being used.
                */}
                <img
                    src="/images/brand/badminton-app.webp"
                    alt=""
                    aria-hidden="true"
                    width={900}
                    height={1125}
                    className="absolute inset-0 -z-10 size-full object-cover opacity-20"
                />
                {/* Scrim: the copy has to stay readable over any part of the photo. */}
                <div className="from-brand-deep via-brand-deep/90 to-brand-deep/70 absolute inset-0 -z-10 bg-gradient-to-t" />

                <Link href={route('home')} aria-label="Patungan" className="relative w-fit">
                    <AppLogo tone="onDeep" />
                </Link>

                <div className="relative max-w-md">
                    <Eyebrow onDeep>Patungan tanpa nagih</Eyebrow>

                    <p className="display text-brand-deep-foreground mt-5 text-[34px] xl:text-[42px]">Kumpulin uang dari grup, tanpa drama nagih.</p>

                    <ul className="divide-brand-deep-muted/20 border-brand-deep-muted/20 mt-9 divide-y border-t">
                        {promises.map((promise) => (
                            <li key={promise.title} className="flex gap-4 py-4">
                                <span className="bg-lime/15 text-lime mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl">
                                    <promise.icon className="size-[18px]" strokeWidth={2.2} />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-brand-deep-foreground text-sm font-bold tracking-tight">{promise.title}</p>
                                    <p className="text-brand-deep-muted mt-1 text-xs leading-relaxed">{promise.body}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-brand-deep-muted relative text-[11px]">Ditenagai Patungan · Bayar bagianmu, beres.</p>
            </aside>

            {/* Form side. */}
            <div className="flex min-h-svh flex-col lg:min-h-0">
                {/* Phones get the brand band the panel provides on desktop. */}
                <header className="surface-deep flex h-14 shrink-0 items-center justify-center lg:hidden">
                    <Link href={route('home')} aria-label="Patungan">
                        <AppLogo tone="onDeep" />
                    </Link>
                </header>

                <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 lg:py-12">
                    <div className="w-full max-w-[26rem]">
                        <h1 className="display text-foreground text-[26px] sm:text-3xl">{title}</h1>
                        {description && <p className="text-muted-foreground mt-2.5 text-sm leading-relaxed">{description}</p>}

                        <div className="mt-8">{children}</div>

                        <p className="text-muted-foreground mt-8 text-[11px] leading-relaxed">
                            Dengan lanjut, kamu setuju memakai Patungan secara wajar.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
