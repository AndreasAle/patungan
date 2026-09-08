import { Eyebrow } from '@/components/patungan/section-heading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/layouts/admin-layout';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Paginated } from '@/types';
import { Head, router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

interface SupportMessage {
    uuid: string;
    name: string;
    contact: string;
    message: string;
    page: string | null;
    account: string | null;
    status: string;
    status_label: string;
    created_at: string | null;
    replied_at: string | null;
}

interface Props {
    messages: Paginated<SupportMessage>;
    filters: { status: string; search: string };
    statuses: { value: string; label: string }[];
    unread: number;
}

const tones: Record<string, string> = {
    NEW: 'bg-warning-soft text-warning',
    READ: 'bg-muted text-muted-foreground',
    REPLIED: 'bg-success-soft text-success',
    CLOSED: 'bg-muted text-muted-foreground',
};

export default function AdminSupport({ messages, filters, statuses, unread }: Props) {
    const [term, setTerm] = useState(filters.search);

    const apply = (params: Record<string, string>) => {
        router.get(route('admin.support'), { ...filters, ...params }, { preserveState: true });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        apply({ search: term });
    };

    const setStatus = (message: SupportMessage, status: string) => {
        router.post(route('admin.support.update', message.uuid), { status }, { preserveScroll: true });
    };

    return (
        <AdminLayout>
            <Head title="Admin · Bantuan" />

            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <Eyebrow>Pesan masuk</Eyebrow>
                    <h1 className="display mt-2.5 text-[22px] sm:text-3xl">Bantuan</h1>
                    <p className="text-muted-foreground mt-2 text-xs">{unread > 0 ? `${unread} pesan belum dibaca` : 'Semua pesan sudah dibaca'}</p>
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
                            placeholder="Nama, kontak, isi pesan"
                            className="h-10 w-64 rounded-xl"
                        />
                        <Button type="submit" variant="outline" className="h-10 rounded-xl">
                            Cari
                        </Button>
                    </form>
                </div>
            </div>

            {messages.data.length === 0 ? (
                <p className="border-border bg-card text-muted-foreground mt-7 rounded-3xl border border-dashed px-5 py-10 text-center text-sm">
                    Belum ada pesan masuk.
                </p>
            ) : (
                <ul className="mt-7 space-y-3">
                    {messages.data.map((message) => (
                        <li key={message.uuid} className="border-border bg-card rounded-3xl border p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-bold tracking-tight">
                                        {message.name}
                                        {message.account && <span className="text-muted-foreground font-normal"> · akun {message.account}</span>}
                                    </p>
                                    <p className="text-muted-foreground mt-0.5 font-mono text-xs">{message.contact}</p>
                                </div>

                                <span className={cn('chip shrink-0', tones[message.status] ?? tones.READ)}>{message.status_label}</span>
                            </div>

                            <p className="text-foreground mt-3 text-sm leading-relaxed whitespace-pre-line">{message.message}</p>

                            <div className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
                                <span>{formatDateTime(message.created_at)}</span>
                                {message.page && <span className="font-mono">{message.page}</span>}
                                {message.replied_at && <span className="text-success">Dibalas {formatDateTime(message.replied_at)}</span>}
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                                {message.status !== 'REPLIED' && (
                                    <Button
                                        variant="outline"
                                        className="h-9 rounded-full px-4 text-xs font-semibold"
                                        onClick={() => setStatus(message, 'REPLIED')}
                                    >
                                        Tandai sudah dibalas
                                    </Button>
                                )}
                                {message.status === 'NEW' && (
                                    <Button
                                        variant="ghost"
                                        className="h-9 rounded-full px-4 text-xs font-semibold"
                                        onClick={() => setStatus(message, 'READ')}
                                    >
                                        Tandai dibaca
                                    </Button>
                                )}
                                {message.status !== 'CLOSED' && (
                                    <Button
                                        variant="ghost"
                                        className="text-muted-foreground h-9 rounded-full px-4 text-xs font-semibold"
                                        onClick={() => setStatus(message, 'CLOSED')}
                                    >
                                        Tutup
                                    </Button>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            {messages.last_page > 1 && (
                <div className="mt-8 flex items-center justify-center gap-3">
                    <Button
                        variant="outline"
                        disabled={messages.current_page === 1}
                        onClick={() => apply({ page: String(messages.current_page - 1) })}
                    >
                        Sebelumnya
                    </Button>
                    <span className="text-muted-foreground text-sm tabular-nums">
                        {messages.current_page} / {messages.last_page}
                    </span>
                    <Button
                        variant="outline"
                        disabled={messages.current_page === messages.last_page}
                        onClick={() => apply({ page: String(messages.current_page + 1) })}
                    >
                        Berikutnya
                    </Button>
                </div>
            )}
        </AdminLayout>
    );
}
