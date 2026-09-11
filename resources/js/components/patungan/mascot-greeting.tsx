import { Mascot, type MascotMood } from '@/components/patungan/mascot';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';

interface GreetingProps {
    name: string;
    activeCount: number;
    awaitingCount: number;
    collectedThisMonth: number;
    className?: string;
}

/**
 * Tuni, reacting to what is actually on the dashboard.
 *
 * The mood is derived, never decorative. Four states the organizer can be in,
 * each with the one sentence that matters and, where there is something to do,
 * the link that does it:
 *
 *   nothing yet      - asleep, because there is genuinely nothing happening
 *   people owe       - thinking, with the count and a way to chase them
 *   all settled      - cheering, with the money that came in
 *   running, no debt - happy
 *
 * A mascot that beams the same way at an empty account and at a finished
 * collection is wallpaper. Tying the face to the state is what makes it worth
 * the pixels on a screen about money.
 */
function read(
    activeCount: number,
    awaitingCount: number,
    collected: number,
): { mood: MascotMood; title: string; body: string; action?: { label: string; href: string } } {
    if (activeCount === 0) {
        return {
            mood: 'sleepy',
            title: 'Belum ada yang jalan',
            body: 'Bikin patungan pertama, share linknya ke grup, selesai.',
            action: { label: 'Buat patungan', href: route('patungan.create') },
        };
    }

    if (awaitingCount > 0) {
        return {
            mood: 'thinking',
            title: `${awaitingCount} orang belum bayar`,
            body: 'Kirim pengingat sekali, biasanya langsung beres.',
            action: { label: 'Lihat patungan', href: route('patungan.index') },
        };
    }

    if (collected > 0) {
        return {
            mood: 'cheer',
            title: 'Semua sudah bayar 🎉',
            body: 'Nggak ada yang perlu ditagih. Saldo kamu siap dicairkan.',
            action: { label: 'Cairkan saldo', href: route('payout.index') },
        };
    }

    return {
        mood: 'happy',
        title: 'Semua aman',
        body: 'Patungan kamu jalan dan nggak ada tunggakan.',
    };
}

export function MascotGreeting({ name, activeCount, awaitingCount, collectedThisMonth, className }: GreetingProps) {
    const firstName = name.split(' ')[0];
    const state = read(activeCount, awaitingCount, collectedThisMonth);

    return (
        <section
            className={cn('border-border bg-card relative flex items-center gap-4 overflow-hidden rounded-3xl border p-4 sm:gap-5 sm:p-5', className)}
        >
            {/* A wash behind the character so it does not float on flat white. */}
            <span aria-hidden="true" className="bg-brand-soft pointer-events-none absolute -top-10 -left-10 size-40 rounded-full opacity-60" />

            <Mascot mood={state.mood} className="relative size-20 shrink-0 sm:size-24" />

            <div className="relative min-w-0 flex-1">
                <p className="text-muted-foreground text-[11px] font-semibold">Halo, {firstName}</p>
                <p className="mt-1 text-base leading-tight font-bold tracking-tight sm:text-lg">{state.title}</p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{state.body}</p>

                {state.action && (
                    <Link href={state.action.href} className="text-primary group mt-2.5 inline-flex items-center gap-1.5 text-xs font-bold">
                        {state.action.label}
                        <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
                    </Link>
                )}
            </div>
        </section>
    );
}
