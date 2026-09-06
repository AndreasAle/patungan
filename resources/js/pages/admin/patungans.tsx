import { DataTable } from '@/components/patungan/data-table';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';
import { formatDate, rupiah } from '@/lib/format';
import type { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

interface AdminPatungan {
    uuid: string;
    title: string;
    organizer: string;
    status: string;
    status_label: string;
    target_amount: number;
    collected_amount: number;
    participant_count: number;
    paid_participant_count: number;
    created_at: string | null;
}

interface Props {
    patungans: Paginated<AdminPatungan>;
    filters: { search: string; status: string };
    statuses: { value: string; label: string }[];
}

export default function AdminPatungans({ patungans, filters, statuses }: Props) {
    const [term, setTerm] = useState(filters.search);

    const apply = (params: Record<string, string>) => {
        router.get(route('admin.patungans'), { ...filters, ...params }, { preserveState: true });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        apply({ search: term });
    };

    return (
        <AdminLayout>
            <Head title="Admin · Patungan" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Patungan</h1>

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
                            placeholder="Cari judul"
                            className="h-10 w-56 rounded-xl"
                        />
                        <Button type="submit" variant="outline" className="h-10 rounded-xl">
                            Cari
                        </Button>
                    </form>
                </div>
            </div>

            <DataTable
                headers={['Judul', 'Organizer', 'Peserta', 'Terkumpul', 'Target', 'Dibuat', 'Status', '']}
                isEmpty={patungans.data.length === 0}
                empty="Tidak ada patungan."
                pagination={{ ...patungans, routeName: 'admin.patungans', params: filters }}
            >
                {patungans.data.map((patungan) => (
                    <tr key={patungan.uuid}>
                        <td className="px-4 py-3 font-medium">{patungan.title}</td>
                        <td className="text-muted-foreground px-4 py-3">{patungan.organizer}</td>
                        <td className="px-4 py-3 tabular-nums">
                            {patungan.paid_participant_count}/{patungan.participant_count}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{rupiah(patungan.collected_amount)}</td>
                        <td className="text-muted-foreground px-4 py-3 tabular-nums">{rupiah(patungan.target_amount)}</td>
                        <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">{formatDate(patungan.created_at)}</td>
                        <td className="px-4 py-3">
                            <StatusBadge status={patungan.status} label={patungan.status_label} />
                        </td>
                        <td className="px-4 py-3 text-right">
                            {patungan.status === 'CLOSED' ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        router.post(route('admin.patungans.status', patungan.uuid), { status: 'ACTIVE' }, { preserveScroll: true })
                                    }
                                >
                                    Buka
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        router.post(route('admin.patungans.status', patungan.uuid), { status: 'CLOSED' }, { preserveScroll: true })
                                    }
                                >
                                    Bekukan
                                </Button>
                            )}
                        </td>
                    </tr>
                ))}
            </DataTable>
        </AdminLayout>
    );
}
