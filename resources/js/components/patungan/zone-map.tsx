import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { MapPin, Sparkles } from 'lucide-react';
import { useState, type CSSProperties } from 'react';

export interface ZoneRow {
    zone: string;
    label: string;
    islands: string;
    count: number;
    amount: number;
    share: number;
}

export interface ZoneBreakdown {
    total: number;
    known: number;
    unknown: number;
    rows: ZoneRow[];
}

const ISLANDS: { d: string; zone: string; name: string }[] = [
    { zone: 'WIB', name: 'Sumatera', d: 'M60 44 L104 40 L150 96 L196 152 L214 196 L196 214 L166 190 L124 130 L78 82 Z' },
    { zone: 'WIB', name: 'Kalimantan Barat', d: 'M232 106 L286 92 L318 118 L322 160 L286 186 L244 172 L222 140 Z' },
    { zone: 'WIB', name: 'Jawa', d: 'M186 232 L246 226 L302 234 L338 242 L336 258 L288 254 L228 250 L188 248 Z' },
    { zone: 'WITA', name: 'Kalimantan Timur', d: 'M322 88 L372 84 L394 116 L388 164 L352 188 L322 160 L318 118 Z' },
    { zone: 'WITA', name: 'Sulawesi', d: 'M424 74 L452 78 L446 120 L482 108 L510 122 L494 146 L458 148 L462 190 L440 200 L428 156 L406 128 Z' },
    {
        zone: 'WITA',
        name: 'Bali & Nusa Tenggara',
        d: 'M356 250 L386 246 L390 258 L360 262 Z M404 248 L446 244 L450 258 L406 262 Z M462 246 L500 242 L504 256 L464 260 Z',
    },
    {
        zone: 'WIT',
        name: 'Maluku',
        d: 'M536 118 L560 112 L566 130 L542 138 Z M540 172 L568 166 L574 186 L546 192 Z M524 214 L552 208 L558 226 L530 232 Z',
    },
    { zone: 'WIT', name: 'Papua', d: 'M596 116 L664 104 L716 120 L740 156 L722 206 L668 222 L616 208 L590 172 Z' },
];

const BORDERS = [{ x: 320 }, { x: 518 }];
const LABELS = [
    { x: 170, text: 'WIB' },
    { x: 420, text: 'WITA' },
    { x: 650, text: 'WIT' },
];

function fillFor(share: number, max: number): string {
    if (share <= 0) return 'var(--zone-empty)';

    const strength = max > 0 ? share / max : 0;
    if (strength > 0.75) return 'var(--zone-4)';
    if (strength > 0.5) return 'var(--zone-3)';
    if (strength > 0.25) return 'var(--zone-2)';
    return 'var(--zone-1)';
}

export function ZoneMap({ breakdown, className }: { breakdown: ZoneBreakdown; className?: string }) {
    const [hovered, setHovered] = useState<string | null>(null);
    const indonesian = breakdown.rows.filter((row) => row.zone !== 'LN');
    const overseas = breakdown.rows.find((row) => row.zone === 'LN');
    const max = Math.max(...indonesian.map((row) => row.share), 0);
    const byZone: Record<string, ZoneRow> = Object.fromEntries(breakdown.rows.map((row) => [row.zone, row]));
    const active = hovered ? byZone[hovered] : null;
    const zoneStats = ['WIB', 'WITA', 'WIT'].map((zone) => byZone[zone] ?? { zone, share: 0, count: 0 });
    const otherCount = (overseas?.count ?? 0) + breakdown.unknown;

    const palette = {
        '--zone-empty': 'rgba(255, 255, 255, 0.13)',
        '--zone-1': 'color-mix(in oklab, var(--color-lime-300) 35%, white)',
        '--zone-2': 'var(--color-lime-300)',
        '--zone-3': 'var(--color-lime-400)',
        '--zone-4': 'var(--color-lime-300)',
    } as CSSProperties;

    return (
        <section
            className={cn(
                'dashboard-card bg-card overflow-hidden rounded-[1.75rem] border border-emerald-100 p-3 shadow-[0_18px_50px_-34px_rgba(4,78,57,0.45)] sm:p-4 dark:border-emerald-400/15',
                className,
            )}
            style={palette}
        >
            <div className="relative isolate overflow-hidden rounded-[1.4rem] bg-[linear-gradient(135deg,#064e3b_0%,#075f46_58%,#164e2d_100%)] px-4 pt-4 pb-3 text-white sm:px-5 sm:pt-5">
                <div className="pointer-events-none absolute -top-16 -right-12 -z-10 size-44 rounded-full bg-lime-300/15 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-8 -z-10 size-36 rounded-full bg-emerald-300/10 blur-2xl" />

                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] text-lime-300 uppercase">
                            <Sparkles className="size-3" />
                            Asal pembayaran
                        </p>
                        <h2 className="display mt-1.5 text-xl text-white sm:text-2xl">Pembayar tersebar</h2>
                    </div>

                    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-50 backdrop-blur-sm">
                        <MapPin className="size-3 text-lime-300" />
                        {breakdown.known} orang
                    </span>
                </div>

                <div className="relative mt-2">
                    <svg
                        viewBox="0 0 780 290"
                        className="h-auto w-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.12)]"
                        role="img"
                        aria-label="Peta skematis zona waktu Indonesia"
                    >
                        {ISLANDS.map((island) => {
                            const row = byZone[island.zone];
                            const dimmed = hovered !== null && hovered !== island.zone;

                            return (
                                <path
                                    key={island.name}
                                    d={island.d}
                                    fill={fillFor(row?.share ?? 0, max)}
                                    stroke="rgba(255,255,255,.08)"
                                    strokeWidth={3}
                                    className={cn('transition-all duration-300', dimmed ? 'opacity-30' : 'opacity-100')}
                                    onMouseEnter={() => setHovered(island.zone)}
                                    onMouseLeave={() => setHovered(null)}
                                >
                                    <title>{`${island.name} · ${row?.share ?? 0}%`}</title>
                                </path>
                            );
                        })}

                        {BORDERS.map((border) => (
                            <line
                                key={border.x}
                                x1={border.x}
                                y1={16}
                                x2={border.x}
                                y2={276}
                                stroke="rgba(255,255,255,.14)"
                                strokeWidth={1.5}
                                strokeDasharray="6 7"
                            />
                        ))}

                        {LABELS.map((label) => (
                            <text
                                key={label.text}
                                x={label.x}
                                y={26}
                                textAnchor="middle"
                                className="fill-emerald-100/65 text-[13px] font-bold tracking-wider"
                            >
                                {label.text}
                            </text>
                        ))}
                    </svg>

                    {active && (
                        <div className="pointer-events-none absolute top-1 right-1 rounded-xl border border-white/10 bg-emerald-950/80 px-3 py-2 shadow-lg backdrop-blur-md">
                            <p className="text-xs font-bold tracking-tight text-white">{active.label}</p>
                            <p className="mt-0.5 text-[10px] text-emerald-100/70">
                                {active.count} pembayaran · {rupiah(active.amount)}
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                    {zoneStats.map((row) => (
                        <button
                            key={row.zone}
                            type="button"
                            className={cn(
                                'rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/10',
                                hovered === row.zone && 'bg-white/10',
                            )}
                            onMouseEnter={() => setHovered(row.zone)}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={() => setHovered(row.zone)}
                            onBlur={() => setHovered(null)}
                        >
                            <span className="block text-[10px] font-semibold tracking-wider text-emerald-100/60">{row.zone}</span>
                            <span className="mt-0.5 block text-lg font-bold text-white tabular-nums">{row.share}%</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-2 pt-3 pb-1">
                <p className="text-muted-foreground text-[10px]">Mengikuti zona waktu perangkat</p>
                {otherCount > 0 && (
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-1 text-[9px] font-semibold">{otherCount} lainnya</span>
                )}
            </div>
        </section>
    );
}
