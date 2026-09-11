import { DataTable } from '@/components/patungan/data-table';
import { PageHeader } from '@/components/patungan/section-heading';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface AuditRow {
    id: number;
    actor_name: string | null;
    actor_email: string | null;
    action: string;
    subject_type: string | null;
    subject_id: string | null;
    subject_label: string | null;
    context: Record<string, unknown> | null;
    ip_address: string | null;
    created_at: string | null;
}

interface Props {
    logs: Paginated<AuditRow>;
    filters: { action: string; q: string };
    actions: string[];
}

/**
 * Plain Indonesian for each action, and whether it moved money.
 *
 * An operator scanning this page should not have to translate
 * "settlement.processed" in their head, and the two actions that touch somebody
 * balance or freeze their account are the ones worth spotting from across the
 * table.
 */
const ACTIONS: Record<string, { label: string; weight: 'money' | 'account' | 'normal' }> = {
    'user.suspended': { label: 'Akun dibekukan', weight: 'account' },
    'user.restored': { label: 'Akun dipulihkan', weight: 'account' },
    'patungan.status_changed': { label: 'Status patungan diubah', weight: 'normal' },
    'settlement.processed': { label: 'Pencairan diproses', weight: 'money' },
    'support.updated': { label: 'Pesan bantuan ditangani', weight: 'normal' },
};

function describe(action: string) {
    return ACTIONS[action] ?? { label: action, weight: 'normal' as const };
}

export default function AdminAudit({ logs, filters, actions }: Props) {
    const [expanded, setExpanded] = useState<number | null>(null);
    const [query, setQuery] = useState(filters.q);

    const reload = (next: Partial<Props['filters']>) =>
        router.get(route('admin.audit'), { ...filters, ...next }, { preserveState: true, replace: true });

    return (
        <AdminLayout>
            <Head title="Admin · Jejak audit" />

            <PageHeader
                eyebrow="Akuntabilitas"
                title="Jejak audit"
                description="Setiap tindakan admin yang mengubah data tercatat di sini. Catatan ini hanya bisa dibaca, tidak bisa diubah atau dihapus."
            />

            <div className="mt-6 flex flex-wrap items-center gap-3">
                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        reload({ q: query });
                    }}
                    className="flex-1 sm:max-w-xs"
                >
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Cari admin atau objek…"
                        aria-label="Cari jejak audit"
                        className="border-input bg-background h-10 w-full rounded-xl border px-3 text-sm"
                    />
                </form>

                <select
                    value={filters.action}
                    onChange={(event) => reload({ action: event.target.value })}
                    aria-label="Saring berdasarkan tindakan"
                    className="border-input bg-background h-10 rounded-xl border px-3 text-sm font-medium"
                >
                    <option value="">Semua tindakan</option>
                    {actions.map((action) => (
                        <option key={action} value={action}>
                            {describe(action).label}
                        </option>
                    ))}
                </select>
            </div>

            <DataTable
                headers={['Waktu', 'Admin', 'Tindakan', 'Objek', 'IP', '']}
                isEmpty={logs.data.length === 0}
                empty="Belum ada tindakan admin yang tercatat."
                pagination={{ ...logs, routeName: 'admin.audit', params: filters }}
            >
                {logs.data.map((log) => {
                    const action = describe(log.action);
                    const open = expanded === log.id;

                    return (
                        <tr key={log.id} className="align-top">
                            <td className="text-muted-foreground px-4 py-3 whitespace-nowrap">{formatDateTime(log.created_at)}</td>
                            <td className="px-4 py-3">
                                <p className="font-semibold">{log.actor_name ?? 'Akun dihapus'}</p>
                                <p className="text-muted-foreground text-[11px]">{log.actor_email ?? '-'}</p>
                            </td>
                            <td className="px-4 py-3">
                                <span
                                    className={cn(
                                        'font-semibold',
                                        action.weight === 'money' && 'text-warning',
                                        action.weight === 'account' && 'text-destructive',
                                    )}
                                >
                                    {action.label}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <p>{log.subject_label ?? '-'}</p>
                                <p className="text-muted-foreground font-mono text-[11px]">
                                    {log.subject_type ?? '-'} {log.subject_id ?? ''}
                                </p>
                            </td>
                            <td className="text-muted-foreground px-4 py-3 font-mono text-[11px]">{log.ip_address ?? '-'}</td>
                            <td className="px-4 py-3 text-right">
                                {log.context && (
                                    <button
                                        type="button"
                                        onClick={() => setExpanded(open ? null : log.id)}
                                        className="text-primary text-xs font-semibold"
                                        aria-expanded={open}
                                    >
                                        {open ? 'Tutup' : 'Detail'}
                                    </button>
                                )}
                            </td>
                        </tr>
                    );
                })}
            </DataTable>

            {logs.data
                .filter((log) => expanded === log.id && log.context)
                .map((log) => (
                    <pre
                        key={log.id}
                        className="border-border bg-muted/40 mt-4 overflow-x-auto rounded-2xl border p-4 font-mono text-[11px] leading-relaxed"
                    >
                        {JSON.stringify(log.context, null, 2)}
                    </pre>
                ))}
        </AdminLayout>
    );
}
