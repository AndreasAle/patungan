import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';
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

/*
 * A schematic archipelago, not a map.
 *
 * The shapes are simplified blobs in roughly the right places, west to east.
 * Drawing an approximate coastline and calling it a map of Indonesia would be
 * worse than drawing an obvious diagram: a reader measures it against the
 * country they know and finds it wrong. A diagram makes no such claim, and the
 * only thing being communicated is which third of the country the money is
 * coming from.
 */
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

/** Where one zone ends and the next begins, in viewBox units. */
const BORDERS = [{ x: 320 }, { x: 518 }];

const LABELS = [
    { x: 170, text: 'WIB' },
    { x: 420, text: 'WITA' },
    { x: 650, text: 'WIT' },
];

/** Deep at the top of the range, barely tinted at the bottom, flat when empty. */
function fillFor(share: number, max: number): string {
    if (share <= 0) return 'var(--zone-empty)';

    const t = max > 0 ? share / max : 0;

    if (t > 0.75) return 'var(--zone-4)';
    if (t > 0.5) return 'var(--zone-3)';
    if (t > 0.25) return 'var(--zone-2)';

    return 'var(--zone-1)';
}

export function ZoneMap({ breakdown, className }: { breakdown: ZoneBreakdown; className?: string }) {
    const [hovered, setHovered] = useState<string | null>(null);

    const indonesian = breakdown.rows.filter((row) => row.zone !== 'LN');
    const overseas = breakdown.rows.find((row) => row.zone === 'LN');
    const max = Math.max(...indonesian.map((row) => row.share), 0);
    const byZone: Record<string, ZoneRow> = Object.fromEntries(breakdown.rows.map((row) => [row.zone, row]));
    const active = hovered ? byZone[hovered] : null;

    const palette = {
        '--zone-empty': 'var(--color-muted)',
        '--zone-1': 'color-mix(in oklab, var(--color-primary) 18%, var(--color-card))',
        '--zone-2': 'color-mix(in oklab, var(--color-primary) 40%, var(--color-card))',
        '--zone-3': 'color-mix(in oklab, var(--color-primary) 68%, var(--color-card))',
        '--zone-4': 'var(--color-primary)',
    } as CSSProperties;

    return (
        <section className={cn('border-border bg-card rounded-3xl border p-5 lg:p-6', className)} style={palette}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-muted-foreground text-[11px] font-bold tracking-[0.14em] uppercase">Asal pembayaran</p>
                    <h2 className="display mt-2 text-lg sm:text-xl">Peta zona pembayar</h2>
                </div>

                <span className="chip bg-brand-soft text-primary shrink-0">
                    <MapPin className="size-3" />
                    {breakdown.known} terpetakan
                </span>
            </div>

            {breakdown.known === 0 ? (
                <p className="text-muted-foreground border-border mt-5 rounded-2xl border border-dashed px-4 py-8 text-center text-sm">
                    Belum ada pembayaran yang bisa dipetakan. Peta ini terisi sendiri begitu ada yang bayar lewat QRIS.
                </p>
            ) : (
                <>
                    <div className="relative mt-5">
                        <svg viewBox="0 0 780 290" className="h-auto w-full" role="img" aria-label="Peta skematis zona waktu Indonesia">
                            {ISLANDS.map((island) => {
                                const row = byZone[island.zone];
                                const dim = hovered !== null && hovered !== island.zone;

                                return (
                                    <path
                                        key={island.name}
                                        d={island.d}
                                        fill={fillFor(row?.share ?? 0, max)}
                                        stroke="var(--color-card)"
                                        strokeWidth={2}
                                        className={cn('transition-opacity', dim ? 'opacity-35' : 'opacity-100')}
                                        onMouseEnter={() => setHovered(island.zone)}
                                        onMouseLeave={() => setHovered(null)}
                                    >
                                        <title>{`${island.name} - ${row?.label ?? ''} ${row?.share ?? 0}%`}</title>
                                    </path>
                                );
                            })}

                            {/*
                                The zone borders, drawn last so they sit on top.
                                Without them the split through Kalimantan reads
                                as a strait between two islands rather than what
                                it is - the WIB/WITA line, which genuinely runs
                                through the middle of that island.
                            */}
                            {BORDERS.map((border) => (
                                <g key={border.x}>
                                    <line
                                        x1={border.x}
                                        y1={16}
                                        x2={border.x}
                                        y2={276}
                                        stroke="var(--color-border)"
                                        strokeWidth={1.5}
                                        strokeDasharray="6 7"
                                    />
                                </g>
                            ))}

                            {LABELS.map((label) => (
                                <text
                                    key={label.text}
                                    x={label.x}
                                    y={26}
                                    textAnchor="middle"
                                    className="fill-muted-foreground text-[13px] font-bold tracking-wider"
                                >
                                    {label.text}
                                </text>
                            ))}
                        </svg>

                        {active && (
                            <div className="surface-deep pointer-events-none absolute top-0 right-0 rounded-2xl px-4 py-3">
                                <p className="text-brand-deep-foreground text-sm font-bold tracking-tight">{active.label}</p>
                                <p className="text-brand-deep-muted mt-0.5 text-[11px]">
                                    {active.count} pembayaran · {rupiah(active.amount)}
                                </p>
                            </div>
                        )}
                    </div>

                    <ul className="mt-5 space-y-3">
                        {indonesian.map((row) => (
                            <li key={row.zone} onMouseEnter={() => setHovered(row.zone)} onMouseLeave={() => setHovered(null)}>
                                <div className="flex items-baseline justify-between gap-3">
                                    <span className="text-sm font-bold tracking-tight">{row.label}</span>
                                    <span className="text-sm font-bold tabular-nums">{row.share}%</span>
                                </div>
                                <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                                    <div
                                        className="bg-primary h-full rounded-full transition-[width] duration-500"
                                        style={{ width: `${max > 0 ? (row.share / max) * 100 : 0}%` }}
                                    />
                                </div>
                                <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">{row.islands}</p>
                            </li>
                        ))}
                    </ul>

                    {(overseas?.count ?? 0) > 0 && (
                        <p className="text-muted-foreground mt-4 text-[11px]">
                            {overseas?.count} pembayaran dari luar Indonesia, tidak digambar di peta.
                        </p>
                    )}
                </>
            )}

            {/* Said plainly, because the alternative is a reader who believes
                this is province-level data. */}
            <p className="text-muted-foreground border-border mt-5 border-t pt-4 text-[11px] leading-relaxed">
                Dihitung dari zona waktu perangkat pembayar, jadi tingkatnya WIB/WITA/WIT - bukan per provinsi. Sumatera dan Jawa masuk zona yang
                sama.
                {breakdown.unknown > 0 && ` ${breakdown.unknown} pembayaran belum punya data zona dan tidak ikut dihitung.`}
            </p>
        </section>
    );
}
