import { DataTable } from '@/components/patungan/data-table';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateTime, rupiah } from '@/lib/format';
import type { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface AdminSettlement {
    uuid: string;
    organizer: string;
    amount: number;
    net_amount: number;
    destination: string;
    holder: string;
    status: string;
    status_label: string;
    provider_reference: string | null;
    requested_at: string | null;
    processed_at: string | null;
    failure_reason: string | null;
}

interface Props {
    settlements: Paginated<AdminSettlement>;
    filters: { status: string };
    statuses: { value: string; label: string }[];
    provider: { name: string; automated: boolean };
}

export default function AdminSettlements({ settlements, filters, statuses, provider }: Props) {
    const [completing, setCompleting] = useState<AdminSettlement | null>(null);
    const [failing, setFailing] = useState<AdminSettlement | null>(null);
    const [reference, setReference] = useState('');
    const [reason, setReason] = useState('');

    const act = (settlement: AdminSettlement, payload: Record<string, string>) => {
        router.post(route('admin.settlements.update', settlement.uuid), payload, {
            preserveScroll: true,
            onFinish: () => {
                setCompleting(null);
                setFailing(null);
                setReference('');
                setReason('');
            },
        });
    };

    return (
        <AdminLayout>
            <Head title="Admin · Pencairan" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight">Pencairan</h1>
                    <p className="text-muted-foreground mt-0.5 text-sm">
                        Provider: <span className="font-semibold">{provider.name}</span>
                        {!provider.automated && ' · diproses manual oleh operator'}
                    </p>
                </div>

                <select
                    value={filters.status}
                    onChange={(event) => router.get(route('admin.settlements'), { status: event.target.value }, { preserveState: true })}
                    className="border-input bg-background h-10 rounded-xl border px-3 text-sm font-medium"
                >
                    <option value="">Semua status</option>
                    {statuses.map((status) => (
                        <option key={status.value} value={status.value}>
                            {status.label}
                        </option>
                    ))}
                </select>
            </div>

            <DataTable
                headers={['Organizer', 'Jumlah', 'Tujuan', 'Pemilik', 'Diminta', 'Diproses', 'Status', 'Aksi']}
                isEmpty={settlements.data.length === 0}
                empty="Tidak ada permintaan pencairan."
                pagination={{ ...settlements, routeName: 'admin.settlements', params: filters }}
            >
                {settlements.data.map((settlement) => {
                    const open = settlement.status === 'PENDING' || settlement.status === 'PROCESSING';

                    return (
                        <tr key={settlement.uuid}>
                            <td className="px-4 py-3 font-medium">{settlement.organizer}</td>
                            <td className="px-4 py-3 tabular-nums">{rupiah(settlement.net_amount)}</td>
                            <td className="text-muted-foreground px-4 py-3">{settlement.destination}</td>
                            <td className="text-muted-foreground px-4 py-3">{settlement.holder}</td>
                            <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">{formatDateTime(settlement.requested_at)}</td>
                            <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">{formatDateTime(settlement.processed_at)}</td>
                            <td className="px-4 py-3">
                                <StatusBadge status={settlement.status} label={settlement.status_label} />
                                {settlement.failure_reason && <p className="text-destructive mt-1 text-xs">{settlement.failure_reason}</p>}
                            </td>
                            <td className="px-4 py-3">
                                {open && (
                                    <div className="flex gap-1.5">
                                        {settlement.status === 'PENDING' && (
                                            <Button variant="outline" size="sm" onClick={() => act(settlement, { action: 'processing' })}>
                                                Proses
                                            </Button>
                                        )}
                                        <Button size="sm" onClick={() => setCompleting(settlement)}>
                                            Selesai
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => setFailing(settlement)}>
                                            Gagal
                                        </Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </DataTable>

            <Dialog open={completing !== null} onOpenChange={(open) => !open && setCompleting(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Tandai pencairan selesai</DialogTitle>
                    </DialogHeader>
                    <Label htmlFor="provider_reference">Nomor referensi transfer</Label>
                    <Input
                        id="provider_reference"
                        value={reference}
                        onChange={(event) => setReference(event.target.value)}
                        className="h-11 rounded-xl"
                    />
                    <Button
                        className="h-11 rounded-xl font-semibold"
                        onClick={() => completing && act(completing, { action: 'complete', provider_reference: reference })}
                    >
                        Simpan
                    </Button>
                </DialogContent>
            </Dialog>

            <Dialog open={failing !== null} onOpenChange={(open) => !open && setFailing(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Tandai pencairan gagal</DialogTitle>
                    </DialogHeader>
                    <p className="text-muted-foreground text-sm">Saldo organizer dikembalikan otomatis.</p>
                    <Label htmlFor="reason">Alasan</Label>
                    <Input id="reason" value={reason} onChange={(event) => setReason(event.target.value)} className="h-11 rounded-xl" />
                    <Button
                        variant="destructive"
                        className="h-11 rounded-xl font-semibold"
                        disabled={reason.trim() === ''}
                        onClick={() => failing && act(failing, { action: 'fail', reason })}
                    >
                        Simpan
                    </Button>
                </DialogContent>
            </Dialog>
        </AdminLayout>
    );
}
