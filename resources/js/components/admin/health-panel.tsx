import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

export interface Integrity {
    balanced: boolean;
    credits: number;
    debits: number;
    net: number;
    expected: number;
    drift: number;
}

export interface Anomaly {
    key: string;
    label: string;
    detail: string;
    count: number;
    severity: 'critical' | 'warning';
}

/**
 * The reconciliation banner.
 *
 * States the drift in rupiah rather than a status word, because "tidak
 * seimbang" tells an operator to worry and "selisih Rp 25.000" tells them how
 * hard. The healthy case is stated just as plainly - a quiet green bar that
 * names the figure it checked is the difference between a dashboard somebody
 * trusts and one they learn to scroll past.
 */
function IntegrityBanner({ integrity }: { integrity: Integrity }) {
    if (integrity.balanced) {
        return (
            <div className="border-success/25 bg-success/5 flex items-start gap-3 rounded-3xl border p-5">
                <CheckCircle2 className="text-success mt-0.5 size-5 shrink-0" strokeWidth={2.3} />
                <div>
                    <p className="text-success font-bold">Ledger seimbang</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        Saldo ledger {rupiah(integrity.net)} sama persis dengan hasil hitung ulang dari tabel pembayaran dan pencairan.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="border-destructive/35 bg-destructive/5 flex items-start gap-3 rounded-3xl border p-5">
            <ShieldAlert className="text-destructive mt-0.5 size-5 shrink-0" strokeWidth={2.3} />
            <div className="min-w-0">
                <p className="text-destructive font-bold">Ledger tidak seimbang — selisih {rupiah(Math.abs(integrity.drift))}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                    {integrity.drift > 0
                        ? 'Ledger mencatat lebih banyak uang daripada yang dibenarkan oleh pembayaran yang masuk. Kemungkinan ada kredit ganda.'
                        : 'Ledger mencatat lebih sedikit daripada uang yang sudah diterima. Kemungkinan ada pembayaran yang tidak pernah dikredit.'}{' '}
                    Jangan proses pencairan sebelum ini dijelaskan.
                </p>
                <dl className="mt-3 grid gap-x-6 gap-y-1 text-[11px] sm:grid-cols-2">
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Saldo menurut ledger</dt>
                        <dd className="font-mono tabular-nums">{rupiah(integrity.net)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Seharusnya</dt>
                        <dd className="font-mono tabular-nums">{rupiah(integrity.expected)}</dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}

export function HealthPanel({ integrity, anomalies }: { integrity: Integrity; anomalies: Anomaly[] }) {
    // Only what is actually wrong. A list of seven permanent zeroes trains an
    // operator to stop reading the list.
    const active = anomalies.filter((anomaly) => anomaly.count > 0);

    return (
        <section className="mt-7 space-y-3">
            <IntegrityBanner integrity={integrity} />

            {active.length === 0 ? (
                <p className="text-muted-foreground text-xs">Tidak ada antrean, webhook, atau pencairan yang tertahan.</p>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                    {active.map((anomaly) => (
                        <div
                            key={anomaly.key}
                            className={cn(
                                'flex items-start gap-3 rounded-3xl border p-4',
                                anomaly.severity === 'critical' ? 'border-destructive/30 bg-destructive/5' : 'border-warning/30 bg-warning/5',
                            )}
                        >
                            <AlertTriangle
                                className={cn('mt-0.5 size-4 shrink-0', anomaly.severity === 'critical' ? 'text-destructive' : 'text-warning')}
                                strokeWidth={2.4}
                            />
                            <div className="min-w-0">
                                <p className="text-sm font-bold">
                                    {anomaly.label}
                                    <span className="text-muted-foreground ml-2 font-mono text-xs tabular-nums">{anomaly.count}</span>
                                </p>
                                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{anomaly.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
