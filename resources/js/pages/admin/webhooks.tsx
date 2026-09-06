import { DataTable } from '@/components/patungan/data-table';
import { Eyebrow } from '@/components/patungan/section-heading';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface WebhookRow {
    id: number;
    provider: string;
    event_type: string | null;
    external_id: string | null;
    signature_valid: boolean;
    status: string;
    error: string | null;
    payload: Record<string, unknown>;
    created_at: string | null;
}

interface Props {
    logs: Paginated<WebhookRow>;
    filters: { status: string };
    statuses: string[];
}

export default function AdminWebhooks({ logs, filters, statuses }: Props) {
    const [expanded, setExpanded] = useState<number | null>(null);

    return (
        <AdminLayout>
            <Head title="Admin · Webhook" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <div>
                        <Eyebrow>Notifikasi gateway</Eyebrow>
                        <h1 className="display mt-2.5 text-[22px] sm:text-3xl">Webhook log</h1>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">Payload sudah disanitasi sebelum disimpan.</p>
                </div>

                <select
                    value={filters.status}
                    onChange={(event) => router.get(route('admin.webhooks'), { status: event.target.value }, { preserveState: true })}
                    className="border-input bg-background h-10 rounded-xl border px-3 text-sm font-medium"
                >
                    <option value="">Semua status</option>
                    {statuses.map((status) => (
                        <option key={status} value={status}>
                            {status}
                        </option>
                    ))}
                </select>
            </div>

            <DataTable
                headers={['Waktu', 'Provider', 'Event', 'Reference', 'Signature', 'Status', '']}
                isEmpty={logs.data.length === 0}
                empty="Belum ada webhook masuk."
                pagination={{ ...logs, routeName: 'admin.webhooks', params: filters }}
            >
                {logs.data.map((log) => (
                    <tr key={log.id} className="align-top">
                        <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                        <td className="px-4 py-3">{log.provider}</td>
                        <td className="px-4 py-3">{log.event_type ?? '-'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{log.external_id ?? '-'}</td>
                        <td className="px-4 py-3">
                            <span className={log.signature_valid ? 'text-success' : 'text-destructive'}>
                                {log.signature_valid ? 'valid' : 'invalid'}
                            </span>
                        </td>
                        <td className="px-4 py-3">
                            <span
                                className={cn(
                                    'font-semibold',
                                    log.status === 'PROCESSED' && 'text-success',
                                    (log.status === 'FAILED' || log.status === 'REJECTED') && 'text-destructive',
                                )}
                            >
                                {log.status}
                            </span>
                            {log.error && <p className="text-muted-foreground mt-1 max-w-xs text-xs">{log.error}</p>}
                        </td>
                        <td className="px-4 py-3">
                            <button
                                type="button"
                                className="text-primary text-xs font-semibold"
                                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                            >
                                {expanded === log.id ? 'Tutup' : 'Payload'}
                            </button>
                            {expanded === log.id && (
                                <pre className="bg-muted mt-2 max-w-md overflow-x-auto rounded-lg p-3 text-xs">
                                    {JSON.stringify(log.payload, null, 2)}
                                </pre>
                            )}
                        </td>
                    </tr>
                ))}
            </DataTable>
        </AdminLayout>
    );
}
