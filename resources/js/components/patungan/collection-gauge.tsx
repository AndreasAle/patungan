import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowUpRight, Coins, Sparkles, UsersRound } from 'lucide-react';

export interface Collection {
    percent: number;
    collected: number;
    due: number;
    unpaid_people: number;
    unpaid_amount: number;
}

const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function progressMessage(percent: number, unpaidPeople: number) {
    if (unpaidPeople === 0 || percent >= 100) return { title: 'Lunas semua!', note: 'Mantap, satu tujuan berhasil dicapai.' };
    if (percent >= 75) return { title: 'Sedikit lagi!', note: 'Dorong bareng sampai garis akhir.' };
    if (percent >= 40) return { title: 'Makin dekat', note: 'Progress-nya sudah mulai terasa.' };
    if (percent > 0) return { title: 'Sudah mulai!', note: 'Yuk, ajak yang lain ikut menyelesaikan.' };

    return { title: 'Siap dimulai', note: 'Bagikan pengingat biar progress segera jalan.' };
}

/** A friendly at-a-glance view of how much of the money owed has arrived. */
export function CollectionGauge({ collection, className }: { collection: Collection; className?: string }) {
    const percent = Math.min(Math.max(collection.percent, 0), 100);
    const progress = CIRCUMFERENCE - (percent / 100) * CIRCUMFERENCE;
    const message = progressMessage(percent, collection.unpaid_people);

    return (
        <section
            className={cn(
                'dashboard-card dark:via-card relative flex flex-col overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/90 via-white to-lime-50/70 p-5 lg:p-6 dark:border-emerald-400/15 dark:from-emerald-400/10 dark:to-lime-400/10',
                className,
            )}
        >
            <div className="relative flex items-center justify-between gap-3">
                <div>
                    <p className="text-primary text-[10px] font-extrabold tracking-[0.16em] uppercase">Progress bareng</p>
                    <h2 className="display mt-1 text-lg sm:text-xl">Uangnya sudah sampai mana?</h2>
                </div>
                <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-2xl">
                    <Sparkles className="size-4.5" strokeWidth={2.3} />
                </span>
            </div>

            <div className="relative mt-5 grid grid-cols-[8.25rem_minmax(0,1fr)] items-center gap-4">
                <div className="relative size-[8.25rem]">
                    <svg
                        viewBox="0 0 120 120"
                        className="size-full -rotate-90"
                        role="img"
                        aria-label={`${percent} persen dari tagihan sudah terkumpul`}
                    >
                        <defs>
                            <linearGradient id="collection-progress" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#0D4D37" />
                                <stop offset=".55" stopColor="#16A66A" />
                                <stop offset="1" stopColor="#C7F33D" />
                            </linearGradient>
                        </defs>
                        <circle
                            cx="60"
                            cy="60"
                            r={RADIUS}
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="12"
                            className="text-emerald-100 dark:text-emerald-300/10"
                        />
                        <circle
                            cx="60"
                            cy="60"
                            r={RADIUS}
                            fill="none"
                            stroke="url(#collection-progress)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={CIRCUMFERENCE}
                            strokeDashoffset={progress}
                            className="transition-[stroke-dashoffset] duration-700"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <p className="display text-2xl tabular-nums">
                            {percent.toLocaleString('id-ID')}
                            <span className="text-sm">%</span>
                        </p>
                        <span className="text-muted-foreground mt-0.5 text-[9px] font-bold uppercase">terkumpul</span>
                    </div>
                </div>

                <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-lime-300 px-2.5 py-1 text-[10px] font-extrabold text-emerald-950">
                        {message.title}
                    </span>
                    <p className="mt-2 text-xs leading-relaxed font-medium">{message.note}</p>
                    <p className="text-muted-foreground mt-2 text-[10px] leading-relaxed tabular-nums">
                        {rupiah(collection.collected)} dari {rupiah(collection.due)}
                    </p>
                </div>
            </div>

            {collection.unpaid_people === 0 ? (
                <div className="relative mt-5 rounded-2xl bg-emerald-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/15">
                    Semua peserta sudah bayar. Keren!
                </div>
            ) : (
                <div className="relative mt-5 grid grid-cols-2 gap-2.5">
                    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-sm dark:border-emerald-300/10 dark:bg-white/5">
                        <UsersRound className="text-primary size-4" />
                        <p className="mt-2 text-base font-extrabold tabular-nums">{collection.unpaid_people} orang</p>
                        <p className="text-muted-foreground text-[10px]">belum bayar</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-white/80 p-3 shadow-sm dark:border-emerald-300/10 dark:bg-white/5">
                        <Coins className="size-4 text-orange-500 dark:text-orange-300" />
                        <p className="mt-2 truncate text-base font-extrabold text-orange-600 tabular-nums dark:text-orange-300">
                            {rupiah(collection.unpaid_amount)}
                        </p>
                        <p className="text-muted-foreground text-[10px]">masih ditunggu</p>
                    </div>
                </div>
            )}

            <Link
                href={route('patungan.index')}
                className="group bg-brand-deep text-brand-deep-foreground relative mt-4 flex items-center justify-between rounded-full px-4 py-3 text-xs font-bold transition hover:brightness-110"
            >
                Cek progress patungan
                <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
        </section>
    );
}
