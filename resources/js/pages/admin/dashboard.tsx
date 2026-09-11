import { HealthPanel, type Anomaly, type Integrity } from '@/components/admin/health-panel';
import { PageHeader } from '@/components/patungan/section-heading';
import AdminLayout from '@/layouts/admin-layout';
import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowUpRight, Download, TrendingDown, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';

interface Flow {
    key: string;
    label: string;
    value: number;
    previous: number;
    delta: number | null;
    format: 'rupiah' | 'count';
    hint: string | null;
    href: string | null;
}

interface Stock {
    key: string;
    label: string;
    value: number;
    format: 'rupiah' | 'count';
    hint: string | null;
    href: string | null;
}

interface Props {
    integrity: Integrity;
    anomalies: Anomaly[];
    window: { value: string; label: string };
    ranges: { value: string; label: string }[];
    flows: Flow[];
    stocks: Stock[];
}

function show(value: number, format: 'rupiah' | 'count') {
    return format === 'rupiah' ? rupiah(value) : value.toLocaleString('id-ID');
}

/**
 * Change against the previous period of equal length.
 *
 * Silent when the server sends null, which it does whenever the comparison
 * would be meaningless - a lifetime range has no "before", and growth from zero
 * is not a percentage. Saying "+100%" for the first payment ever taken would be
 * a lie wearing the clothes of a metric.
 */
function Delta({ delta, previous, format }: { delta: number | null; previous: number; format: 'rupiah' | 'count' }) {
    if (delta === null) {
        return <p className="text-muted-foreground mt-2 text-[11px]">Tidak ada pembanding</p>;
    }

    const up = delta > 0;
    const flat = delta === 0;
    const Icon = up ? TrendingUp : TrendingDown;

    return (
        <p
            className={cn(
                'mt-2 flex items-center gap-1.5 text-[11px] font-semibold',
                flat ? 'text-muted-foreground' : up ? 'text-success' : 'text-destructive',
            )}
            title={`Periode sebelumnya: ${show(previous, format)}`}
        >
            {!flat && <Icon className="size-3.5" strokeWidth={2.6} />}
            {up ? '+' : ''}
            {delta.toLocaleString('id-ID')}% dari periode sebelumnya
        </p>
    );
}

function MetricCard({
    label,
    value,
    hint,
    href,
    children,
}: {
    label: string;
    value: string;
    hint?: string | null;
    href?: string | null;
    children?: ReactNode;
}) {
    const body = (
        <>
            <p className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase">
                {label}
                {href && <ArrowUpRight className="size-3.5 opacity-0 transition group-hover:opacity-100" />}
            </p>
            <p className="display mt-2.5 text-2xl tabular-nums">{value}</p>
            {children}
            {hint && <p className="text-muted-foreground mt-1.5 text-xs">{hint}</p>}
        </>
    );

    const classes = 'border-border bg-card block rounded-3xl border p-5 text-left';

    return href ? (
        <Link href={href} className={cn(classes, 'group hover:border-primary/40 transition')}>
            {body}
        </Link>
    ) : (
        <div className={classes}>{body}</div>
    );
}

export default function AdminDashboard({ integrity, anomalies, window: range, ranges, flows, stocks }: Props) {
    const setRange = (value: string) => router.get(route('admin.dashboard'), { range: value }, { preserveState: true, replace: true });

    return (
        <AdminLayout>
            <Head title="Admin" />

            <PageHeader
                eyebrow="Platform"
                title="Ringkasan"
                description="Kesehatan sistem lebih dulu, baru angka. Semuanya dihitung ulang tiap kali halaman ini dibuka."
            />

            <HealthPanel integrity={integrity} anomalies={anomalies} />

            <div className="mt-9 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-base font-bold">Aktivitas</h2>
                    <p className="text-muted-foreground text-xs">Yang terjadi selama {range.label.toLowerCase()} terakhir.</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="border-border bg-card flex rounded-full border p-1">
                        {ranges.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setRange(option.value)}
                                aria-pressed={option.value === range.value}
                                className={cn(
                                    'rounded-full px-3 py-1.5 text-xs font-semibold transition',
                                    option.value === range.value
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    {/*
                     * Plain anchors, not Inertia links: these are file downloads,
                     * and routing them through the SPA would fetch a CSV into
                     * memory and render nothing.
                     */}
                    <a
                        href={route('admin.export', { dataset: 'payments', range: range.value })}
                        className="border-border hover:border-primary/40 flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition"
                    >
                        <Download className="size-3.5" />
                        Payments
                    </a>
                    <a
                        href={route('admin.export', { dataset: 'settlements', range: range.value })}
                        className="border-border hover:border-primary/40 flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold transition"
                    >
                        <Download className="size-3.5" />
                        Pencairan
                    </a>
                </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {flows.map((flow) => (
                    <MetricCard key={flow.key} label={flow.label} value={show(flow.value, flow.format)} hint={flow.hint} href={flow.href}>
                        <Delta delta={flow.delta} previous={flow.previous} format={flow.format} />
                    </MetricCard>
                ))}
            </div>

            <div className="mt-9">
                <h2 className="text-base font-bold">Posisi saat ini</h2>
                {/*
                 * Held balance is a level, not something that happened during a
                 * period. Kept in its own section so nobody reads it under the
                 * range selector above and takes it for money received this week.
                 */}
                <p className="text-muted-foreground text-xs">Angka ini tidak terpengaruh pilihan rentang waktu.</p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {stocks.map((stock) => (
                    <MetricCard key={stock.key} label={stock.label} value={show(stock.value, stock.format)} hint={stock.hint} href={stock.href} />
                ))}
            </div>
        </AdminLayout>
    );
}
