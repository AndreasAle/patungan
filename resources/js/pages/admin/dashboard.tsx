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

export default function AdminDashboard({ stats }: { stats: Stats }) {
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

            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Ringkasan platform</h1>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((card) => (
                    <div key={card.label} className="border-border bg-card rounded-2xl border p-4">
                        <p className="text-muted-foreground text-sm">{card.label}</p>
                        <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{card.value}</p>
                        {card.hint && <p className="text-muted-foreground mt-1 text-xs">{card.hint}</p>}
                    </div>
                ))}
            </div>
        </AdminLayout>
    );
}
