import AppLogoIcon from '@/components/app-logo-icon';
import { cn } from '@/lib/utils';
import { ArrowUpRight, Check, QrCode, Users } from 'lucide-react';

/*
 * Built from vector shapes rather than an exported image.
 *
 * A banner is the one thing on the dashboard guaranteed to be looked at on a
 * retina laptop and a cheap Android in the same day, and a raster export is
 * either soft on one or a 400KB download on the other. It also means the copy
 * and the member count are text - editable, translatable, and readable by a
 * screen reader instead of locked inside a PNG.
 */

/** Layered leaves. Purely decorative, hidden from assistive technology. */
function Foliage() {
    return (
        <svg viewBox="0 0 420 260" aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 h-full w-auto opacity-90">
            <defs>
                <linearGradient id="leaf-a" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#7ED957" />
                    <stop offset="100%" stopColor="#2E8B4A" />
                </linearGradient>
                <linearGradient id="leaf-b" x1="0" y1="1" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1E6B3C" />
                    <stop offset="100%" stopColor="#4CAF50" />
                </linearGradient>
            </defs>

            <path d="M300 260C300 176 344 108 420 84v176Z" fill="url(#leaf-b)" opacity="0.55" />
            <path d="M228 260c0-92 52-150 128-176v176Z" fill="url(#leaf-a)" opacity="0.35" />
            <path d="M352 258c-38-46-30-118 22-158 40 44 34 116-22 158Z" fill="url(#leaf-a)" opacity="0.75" />
            <path d="M262 260c-24-52 4-116 60-140 16 60-14 116-60 140Z" fill="url(#leaf-b)" opacity="0.7" />
            <path d="M396 260c-30-40-22-98 20-130 26 38 20 96-20 130Z" fill="url(#leaf-a)" opacity="0.6" />
        </svg>
    );
}

/** The little floating proof-points from the marketing artwork. */
function Pill({ icon: Icon, label, tone }: { icon: typeof QrCode; label: string; tone: 'lime' | 'white' }) {
    return (
        <span
            className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold tracking-tight shadow-[0_8px_24px_rgba(6,40,24,0.28)]',
                tone === 'lime' ? 'bg-lime text-lime-foreground' : 'bg-white text-[#0F3D26]',
            )}
        >
            <Icon className="size-3.5" strokeWidth={2.8} />
            {label}
        </span>
    );
}

export function CommunityBanner({ href, members, className }: { href: string; members: string; className?: string }) {
    return (
        <a
            href={href}
            className={cn(
                'surface-deep group relative block overflow-hidden rounded-3xl px-5 py-6 sm:px-7 sm:py-7',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                className,
            )}
        >
            <Foliage />

            {/* Keeps the headline legible where it crosses the brightest leaves. */}
            <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-brand-deep)_38%,transparent_78%)]" />

            <span className="relative flex items-start justify-between gap-4">
                <span className="min-w-0">
                    <span className="flex items-center gap-2">
                        <AppLogoIcon className="size-6" plate />
                        <span className="text-brand-deep-foreground text-sm font-extrabold tracking-tight">Patungan</span>
                    </span>

                    <span className="text-brand-deep-foreground mt-4 block text-2xl leading-[1.1] font-extrabold tracking-tight sm:text-[28px]">
                        Patungan
                        <br />
                        <span className="text-lime">jadi gampang</span>
                    </span>

                    <span className="text-brand-deep-muted mt-2.5 block text-xs leading-relaxed sm:text-sm">
                        Bikin link, share ke grup, dan bayar tanpa ribet.
                    </span>

                    <span className="mt-5 flex items-center gap-3">
                        <span className="flex -space-x-2">
                            {['bg-lime', 'bg-white/90', 'bg-white/70', 'bg-white/50'].map((tone, index) => (
                                <span key={tone} className={cn('ring-brand-deep flex size-7 items-center justify-center rounded-full ring-2', tone)}>
                                    <Users className="size-3 text-[#0F3D26]" strokeWidth={2.6} aria-hidden="true" />
                                    <span className="sr-only">Anggota {index + 1}</span>
                                </span>
                            ))}
                        </span>
                        <span className="text-brand-deep-foreground text-xs font-semibold">{members}</span>
                    </span>
                </span>

                <span className="flex shrink-0 flex-col items-end gap-2.5">
                    <ArrowUpRight className="text-brand-deep-foreground size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    <span className="hidden flex-col items-end gap-2 sm:flex">
                        <Pill icon={QrCode} label="QRIS Cepat" tone="lime" />
                        <Pill icon={Check} label="Status Bayar" tone="white" />
                    </span>
                </span>
            </span>
        </a>
    );
}
