import { DataTable } from '@/components/patungan/data-table';
import { Eyebrow } from '@/components/patungan/section-heading';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import type { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

interface AdminPayment {
    uuid: string;
    reference: string;
    provider_reference: string | null;
    external_id: string | null;
    organizer: string;
    patungan: string;
    participant: string;
    amount: number;
    charged_amount: number;
    platform_fee: number;
    gateway_fee: number;
    fee: number;
    net_amount: number;
    gateway: string;
    status: string;
    status_label: string;
    created_at: string | null;
    paid_at: string | null;
}

interface Props {
    payments: Paginated<AdminPayment>;
    filters: { search: string; status: string };
    statuses: { value: string; label: string }[];
}

export default function AdminPayments({ payments, filters, statuses }: Props) {
    const [term, setTerm] = useState(filters.search);

    const apply = (params: Record<string, string>) => {
        router.get(route('admin.payments'), { ...filters, ...params }, { preserveState: true });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        apply({ search: term });
    };

    return (
        <AdminLayout>
            <Head title="Admin · Payments" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <Eyebrow>Transaksi masuk</Eyebrow>
                    <h1 className="display mt-2.5 text-[22px] sm:text-3xl">Payments</h1>
                </div>

                <div className="flex flex-wrap gap-2">
                    <select
                        value={filters.status}
                        onChange={(event) => apply({ status: event.target.value })}
                        className="border-input bg-background h-10 rounded-xl border px-3 text-sm font-medium"
                    >
                        <option value="">Semua status</option>
                        {statuses.map((status) => (
                            <option key={status.value} value={status.value}>
                                {status.label}
                            </option>
                        ))}
                    </select>

                    <form onSubmit={submit} className="flex gap-2">
                        <Input
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                            placeholder="Reference, provider ref, external id, nama"
                            className="h-10 w-72 rounded-xl"
                        />
                        <Button type="submit" variant="outline" className="h-10 rounded-xl">
                            Cari
                        </Button>
                    </form>
                </div>
            </div>

            <DataTable
                headers={[
                    'Reference',
                    'Provider ref',
                    'Organizer',
                    'Patungan',
                    'Peserta',
                    'Gross',
                    'Platform',
                    'Provider fee',
                    'Net',
                    'Provider',
                    'Waktu',
                    'Status',
                ]}
                isEmpty={payments.data.length === 0}
                empty="Tidak ada payment."
                pagination={{ ...payments, routeName: 'admin.payments', params: filters }}
            >
                {payments.data.map((payment) => (
                    <tr key={payment.uuid}>
                        <td className="px-4 py-3 font-mono text-xs">{payment.reference}</td>
                        <td className="text-muted-foreground px-4 py-3 font-mono text-[11px]">
                            {payment.provider_reference ?? '-'}
                            {payment.external_id && <span className="block opacity-60">ext {payment.external_id}</span>}
                        </td>
                        <td className="text-muted-foreground px-4 py-3">{payment.organizer}</td>
                        <td className="px-4 py-3">{payment.patungan}</td>
                        <td className="px-4 py-3">{payment.participant}</td>
                        <td className="px-4 py-3 tabular-nums">{rupiah(payment.charged_amount)}</td>
                        <td className="text-muted-foreground px-4 py-3 tabular-nums">{rupiah(payment.platform_fee)}</td>
                        <td className="text-muted-foreground px-4 py-3 tabular-nums">{rupiah(payment.gateway_fee)}</td>
                        <td className="px-4 py-3 tabular-nums">{rupiah(payment.net_amount)}</td>
                        <td className="text-muted-foreground px-4 py-3">{payment.gateway}</td>
                        <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">{formatDateTime(payment.paid_at ?? payment.created_at)}</td>
                        <td className="px-4 py-3">
                            <StatusBadge status={payment.status} label={payment.status_label} />
                        </td>
                    </tr>
                ))}
            </DataTable>
        </AdminLayout>
    );
}
