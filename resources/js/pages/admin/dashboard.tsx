import { HealthPanel, type Anomaly, type Integrity } from '@/components/admin/health-panel';
import { PageHeader } from '@/components/patungan/section-heading';
import AdminLayout from '@/layouts/admin-layout';
import { rupiah } from '@/lib/format';
import { Head } from '@inertiajs/react';

interface Stats {
    users: number;
    patungans: number;
    patungans_active: number;
    gmv: number;
    payments_paid: number;
    payments_pending: number;
    payments_failed: number;
    platform_revenue: number;
    payouts_pending: number;
    payouts_amount: number;
    webhook_failures: number;
}

export default function AdminDashboard({ stats, integrity, anomalies }: { stats: Stats; integrity: Integrity; anomalies: Anomaly[] }) {
    const cards: { label: string; value: string; hint?: string }[] = [
        { label: 'GMV', value: rupiah(stats.gmv), hint: 'Total pembayaran berhasil' },
        { label: 'Pendapatan platform', value: rupiah(stats.platform_revenue), hint: 'Akumulasi biaya layanan' },
        { label: 'Dana dicairkan', value: rupiah(stats.payouts_amount) },
        { label: 'Users', value: stats.users.toLocaleString('id-ID') },
        { label: 'Patungan', value: stats.patungans.toLocaleString('id-ID'), hint: `${stats.patungans_active} aktif` },
        { label: 'Payment berhasil', value: stats.payments_paid.toLocaleString('id-ID') },
        { label: 'Payment pending', value: stats.payments_pending.toLocaleString('id-ID') },
        { label: 'Payment gagal / kedaluwarsa', value: stats.payments_failed.toLocaleString('id-ID') },
        { label: 'Pencairan menunggu', value: stats.payouts_pending.toLocaleString('id-ID') },
        { label: 'Webhook bermasalah', value: stats.webhook_failures.toLocaleString('id-ID') },
    ];

    return (
        <AdminLayout>
            <Head title="Admin" />

            <PageHeader
                eyebrow="Platform"
                title="Ringkasan"
                description="Kesehatan sistem lebih dulu, baru angka agregat. Semuanya dihitung ulang tiap kali halaman ini dibuka."
            />

            <HealthPanel integrity={integrity} anomalies={anomalies} />

            <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <div key={card.label} className="border-border bg-card rounded-3xl border p-5">
                        <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">{card.label}</p>
                        <p className="display mt-2.5 text-2xl tabular-nums">{card.value}</p>
                        {card.hint && <p className="text-muted-foreground mt-1.5 text-xs">{card.hint}</p>}
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
