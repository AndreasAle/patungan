import { CategoryIcon } from '@/components/patungan/category-icon';
import { ConfirmDialog } from '@/components/patungan/confirm-dialog';
import { MoneyText } from '@/components/patungan/money-text';
import { ProgressBar } from '@/components/patungan/progress-bar';
import { SharePatungan } from '@/components/patungan/share-patungan';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OrganizerParticipant, PatunganDetail } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Check, Clock, Lock, LockOpen, Plus, Settings2, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

type Filter = 'ALL' | 'PAID' | 'UNPAID';

interface ShowProps {
    patungan: PatunganDetail;
    can: { manage: boolean; close: boolean };
    share_message: string;
}

export default function PatunganShow({ patungan, can, share_message }: ShowProps) {
    const [filter, setFilter] = useState<Filter>('ALL');
    const [closing, setClosing] = useState(false);
    const [removing, setRemoving] = useState<OrganizerParticipant | null>(null);

    const [newName, setNewName] = useState('');
    const [addingParticipant, setAddingParticipant] = useState(false);

    const filtered = useMemo(() => {
        if (filter === 'PAID') return patungan.participants.filter((p) => p.status === 'PAID');
        if (filter === 'UNPAID') return patungan.participants.filter((p) => p.status !== 'PAID');

        return patungan.participants;
    }, [patungan.participants, filter]);

    const addParticipant = (event: FormEvent) => {
        event.preventDefault();
        const name = newName.trim();
        if (name === '') return;

        router.post(
            route('participant.store', patungan.uuid),
            { participants: [{ name, amount: patungan.equal_amount }] },
            {
                preserveScroll: true,
                onStart: () => setAddingParticipant(true),
                onFinish: () => setAddingParticipant(false),
                onSuccess: () => setNewName(''),
            },
        );
    };

    const isOpen = patungan.status === 'ACTIVE' || patungan.status === 'DRAFT';

    return (
        <PatunganLayout title={patungan.title} back={route('patungan.index')}>
            <Head title={patungan.title} />

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div>
                    <div className="flex items-start gap-3">
                        <CategoryIcon category={patungan.category} size="lg" />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xl font-extrabold tracking-tight">{patungan.title}</h1>
                                <StatusBadge status={patungan.status} label={patungan.status_label} />
                            </div>
                            {patungan.description && <p className="text-muted-foreground mt-1 text-sm">{patungan.description}</p>}
                        </div>

                        {can.manage && (
                            <Button asChild variant="outline" size="icon" aria-label="Ubah patungan" className="shrink-0 rounded-xl">
                                <Link href={route('patungan.edit', patungan.uuid)}>
                                    <Settings2 className="size-4" />
                                </Link>
                            </Button>
                        )}
                    </div>

                    <div className="border-border bg-card mt-5 rounded-2xl border p-5">
                        <MoneyText amount={patungan.collected_amount} size="xl" className="text-primary" />
                        <p className="text-muted-foreground mt-1 text-sm">
                            terkumpul dari <span className="text-foreground font-semibold">Rp{patungan.target_amount.toLocaleString('id-ID')}</span>
                        </p>

                        <ProgressBar
                            className="mt-4"
                            value={patungan.collected_amount}
                            total={patungan.target_amount}
                            tone={patungan.status === 'COMPLETED' ? 'success' : 'brand'}
                        />

                        <p className="mt-2 text-sm font-medium">
                            {patungan.paid_participant_count} dari {patungan.participant_count} orang sudah bayar
                        </p>

                        {patungan.expires_at && (
                            <p
                                className={cn(
                                    'mt-3 flex items-center gap-1.5 text-sm',
                                    patungan.has_expired ? 'text-destructive font-medium' : 'text-muted-foreground',
                                )}
                            >
                                <Clock className="size-4" />
                                {patungan.has_expired ? 'Batas bayar lewat' : 'Batas bayar'} {formatDateTime(patungan.expires_at)}
                            </p>
                        )}
                    </div>

                    <div className="mt-5 lg:hidden">
                        <SharePatungan url={patungan.public_url} message={share_message} />
                    </div>

                    <section className="mt-6">
                        <div className="flex items-center gap-2">
                            {(
                                [
                                    ['ALL', 'Semua'],
                                    ['PAID', 'Sudah bayar'],
                                    ['UNPAID', 'Belum bayar'],
                                ] as const
                            ).map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setFilter(value)}
                                    className={cn(
                                        'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                                        filter === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent',
                                    )}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <ul className="mt-3 space-y-2">
                            {filtered.map((participant) => (
                                <li
                                    key={participant.uuid}
                                    className={cn(
                                        'border-border bg-card flex items-center gap-3 rounded-2xl border px-4 py-3',
                                        participant.status === 'PAID' && 'bg-success-soft/40',
                                    )}
                                >
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-semibold">{participant.name}</p>
                                        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-sm">
                                            <MoneyText amount={participant.amount_due} size="sm" className="text-muted-foreground font-medium" />
                                            <span>·</span>
                                            <span>{participant.status_label}</span>
                                            {participant.paid_at && <span>{formatTime(participant.paid_at)}</span>}
                                            {participant.paid_method === 'MANUAL' && (
                                                <span className="bg-muted rounded px-1.5 py-0.5 text-xs font-medium">manual</span>
                                            )}
                                        </div>
                                    </div>

                                    {participant.status === 'PAID' ? (
                                        <span className="bg-success text-success-foreground flex size-8 items-center justify-center rounded-full">
                                            <Check className="size-4" strokeWidth={3} />
                                        </span>
                                    ) : (
                                        can.manage && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="rounded-lg"
                                                    onClick={() =>
                                                        router.post(
                                                            route('participant.mark-paid', [patungan.uuid, participant.uuid]),
                                                            {},
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                >
                                                    Tandai lunas
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={`Hapus ${participant.name}`}
                                                    className="text-muted-foreground hover:text-destructive"
                                                    onClick={() => setRemoving(participant)}
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            </div>
                                        )
                                    )}
                                </li>
                            ))}
                        </ul>

                        {filtered.length === 0 && (
                            <p className="bg-muted text-muted-foreground mt-3 rounded-xl px-4 py-3 text-sm">Tidak ada peserta di filter ini.</p>
                        )}

                        {can.manage && (
                            <form onSubmit={addParticipant} className="mt-4 flex gap-2">
                                <Input
                                    value={newName}
                                    onChange={(event) => setNewName(event.target.value)}
                                    placeholder="Tambah peserta"
                                    aria-label="Tambah peserta"
                                    className="h-11 rounded-xl"
                                />
                                <Button type="submit" className="h-11 rounded-xl px-4" disabled={addingParticipant}>
                                    <Plus className="size-4" />
                                </Button>
                            </form>
                        )}
                    </section>

                    {can.close && (
                        <div className="mt-8">
                            {isOpen ? (
                                <Button variant="outline" className="h-11 rounded-xl" onClick={() => setClosing(true)}>
                                    <Lock className="size-4" />
                                    Tutup patungan
                                </Button>
                            ) : (
                                patungan.status === 'CLOSED' && (
                                    <Button
                                        variant="outline"
                                        className="h-11 rounded-xl"
                                        onClick={() => router.post(route('patungan.reopen', patungan.uuid), {}, { preserveScroll: true })}
                                    >
                                        <LockOpen className="size-4" />
                                        Buka lagi
                                    </Button>
                                )
                            )}
                        </div>
                    )}
                </div>

                <aside className="hidden lg:block">
                    <SharePatungan url={patungan.public_url} message={share_message} />
                </aside>
            </div>

            <ConfirmDialog
                open={closing}
                onOpenChange={setClosing}
                title="Tutup patungan ini?"
                description="Peserta tidak bisa bayar lagi setelah ditutup. Kamu masih bisa membukanya kembali."
                confirmLabel="Tutup"
                onConfirm={() => {
                    router.post(route('patungan.close', patungan.uuid), {}, { preserveScroll: true, onFinish: () => setClosing(false) });
                }}
            />

            <ConfirmDialog
                open={removing !== null}
                onOpenChange={(open) => !open && setRemoving(null)}
                title={`Hapus ${removing?.name ?? ''}?`}
                description="Peserta ini akan dihapus dari patungan."
                confirmLabel="Hapus"
                destructive
                onConfirm={() => {
                    if (!removing) return;
                    router.delete(route('participant.destroy', [patungan.uuid, removing.uuid]), {
                        preserveScroll: true,
                        onFinish: () => setRemoving(null),
                    });
                }}
            />
        </PatunganLayout>
    );
}
