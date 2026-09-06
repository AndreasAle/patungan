import { CategoryIcon } from '@/components/patungan/category-icon';
import { ConfirmDialog } from '@/components/patungan/confirm-dialog';
import { PasteNamesSheet } from '@/components/patungan/paste-names-sheet';
import { ProgressBar } from '@/components/patungan/progress-bar';
import { SharePatungan } from '@/components/patungan/share-patungan';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, formatTime, rupiah } from '@/lib/format';
import type { ParsedName } from '@/lib/parse-names';
import { cn } from '@/lib/utils';
import type { OrganizerParticipant, PatunganDetail } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Check, ClipboardPaste, Clock, Lock, LockOpen, Plus, ReceiptText, Settings2, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

type Filter = 'ALL' | 'PAID' | 'UNPAID';

interface ShowProps {
    patungan: PatunganDetail;
    can: { manage: boolean; close: boolean };
    share_message: string;
}

const filters: [Filter, string][] = [
    ['ALL', 'Semua'],
    ['PAID', 'Sudah bayar'],
    ['UNPAID', 'Belum bayar'],
];

export default function PatunganShow({ patungan, can, share_message }: ShowProps) {
    const [filter, setFilter] = useState<Filter>('ALL');
    const [closing, setClosing] = useState(false);
    const [removing, setRemoving] = useState<OrganizerParticipant | null>(null);
    const [newName, setNewName] = useState('');
    const [addingParticipant, setAddingParticipant] = useState(false);
    const [pasting, setPasting] = useState(false);

    const filtered = useMemo(() => {
        if (filter === 'PAID') return patungan.participants.filter((p) => p.status === 'PAID');
        if (filter === 'UNPAID') return patungan.participants.filter((p) => p.status !== 'PAID');

        return patungan.participants;
    }, [patungan.participants, filter]);

    const counts = useMemo(
        () => ({
            ALL: patungan.participants.length,
            PAID: patungan.participants.filter((p) => p.status === 'PAID').length,
            UNPAID: patungan.participants.filter((p) => p.status !== 'PAID').length,
        }),
        [patungan.participants],
    );

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

    const addPastedNames = (entries: ParsedName[]) => {
        router.post(
            route('participant.store', patungan.uuid),
            { participants: entries.map((entry) => ({ name: entry.name, note: entry.note, amount: patungan.equal_amount })) },
            { preserveScroll: true },
        );
    };

    const isOpen = patungan.status === 'ACTIVE' || patungan.status === 'DRAFT';

    return (
        <PatunganLayout
            title={patungan.title}
            back={route('patungan.index')}
            hero={
                <div>
                    <div className="flex items-start gap-3">
                        <CategoryIcon category={patungan.category} size="sm" className="bg-white/15 text-white" />
                        <div className="min-w-0 flex-1">
                            <h1 className="text-brand-deep-foreground truncate text-base font-bold tracking-tight">{patungan.title}</h1>
                            <p className="text-brand-deep-muted mt-0.5 truncate text-xs">
                                {patungan.split_type === 'EQUAL' && patungan.equal_amount
                                    ? `${rupiah(patungan.equal_amount)} / orang`
                                    : 'Nominal tiap orang berbeda'}
                            </p>
                        </div>
                        <StatusBadge status={patungan.status} label={patungan.status_label} />
                    </div>

                    <div className="mt-5">
                        <p className="text-brand-deep-foreground text-[26px] leading-none font-bold tracking-tight sm:text-3xl">
                            {rupiah(patungan.collected_amount)}
                        </p>
                        <p className="text-brand-deep-muted mt-1 text-[11px]">terkumpul dari {rupiah(patungan.target_amount)}</p>

                        <ProgressBar className="mt-3" value={patungan.collected_amount} total={patungan.target_amount} tone="onDeep" />

                        <div className="text-brand-deep-muted mt-2 flex items-center justify-between gap-3 text-[11px]">
                            <span>
                                <span className="text-brand-deep-foreground font-semibold">{patungan.paid_participant_count}</span> dari{' '}
                                {patungan.participant_count} orang sudah bayar
                            </span>
                            {patungan.expires_at && (
                                <span className={cn('inline-flex items-center gap-1', patungan.has_expired && 'text-lime font-semibold')}>
                                    <Clock className="size-3" />
                                    {patungan.has_expired ? 'Lewat batas' : formatDateTime(patungan.expires_at)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            }
            action={
                can.manage ? (
                    <Link href={route('patungan.edit', patungan.uuid)} className="text-brand-deep-foreground/80 p-1.5" aria-label="Ubah patungan">
                        <Settings2 className="size-5" />
                    </Link>
                ) : undefined
            }
        >
            <Head title={patungan.title} />

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_19rem]">
                <div className="lg:order-2">
                    <SharePatungan url={patungan.public_url} message={share_message} />
                </div>

                <div className="lg:order-1">
                    {patungan.description && (
                        <p className="text-muted-foreground border-border bg-card rounded-2xl border px-3.5 py-3 text-xs leading-relaxed">
                            {patungan.description}
                        </p>
                    )}

                    <section className={cn(patungan.description && 'mt-3')}>
                        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                            {filters.map(([value, label]) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => setFilter(value)}
                                    aria-pressed={filter === value}
                                    className={cn(
                                        'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition',
                                        filter === value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent',
                                    )}
                                >
                                    {label}
                                    <span className={cn('tabular-nums', filter === value ? 'opacity-80' : 'opacity-60')}>{counts[value]}</span>
                                </button>
                            ))}
                        </div>

                        <ul className="mt-2.5 space-y-2">
                            {filtered.map((participant) => {
                                const paid = participant.status === 'PAID';

                                return (
                                    <li
                                        key={participant.uuid}
                                        className={cn(
                                            'flex items-center gap-3 rounded-2xl border px-3.5 py-3',
                                            paid ? 'border-success/20 bg-success-soft/50' : 'border-border bg-card',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                                                paid ? 'bg-success text-success-foreground' : 'bg-brand-soft text-primary',
                                            )}
                                            aria-hidden="true"
                                        >
                                            {paid ? <Check className="size-4" strokeWidth={3} /> : participant.name.charAt(0).toUpperCase()}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold">{participant.name}</p>
                                            <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                                                {rupiah(participant.amount_due)}
                                                {paid && participant.paid_at && ` · ${formatTime(participant.paid_at)}`}
                                                {paid && participant.paid_method === 'MANUAL' && ' · manual'}
                                                {!paid && ` · ${participant.status_label}`}
                                            </p>
                                        </div>

                                        {paid
                                            ? participant.invoice_url && (
                                                  <a
                                                      href={participant.invoice_url}
                                                      className="text-success border-success/30 hover:bg-success/10 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition"
                                                  >
                                                      <ReceiptText className="size-3.5" />
                                                      Invoice
                                                  </a>
                                              )
                                            : can.manage && (
                                                  <div className="flex shrink-0 items-center gap-1">
                                                      <button
                                                          type="button"
                                                          onClick={() =>
                                                              router.post(
                                                                  route('participant.mark-paid', [patungan.uuid, participant.uuid]),
                                                                  {},
                                                                  { preserveScroll: true },
                                                              )
                                                          }
                                                          className="border-border hover:border-primary/40 hover:text-primary h-8 rounded-lg border px-2.5 text-[11px] font-semibold transition"
                                                      >
                                                          Tandai lunas
                                                      </button>
                                                      <button
                                                          type="button"
                                                          aria-label={`Hapus ${participant.name}`}
                                                          onClick={() => setRemoving(participant)}
                                                          className="text-muted-foreground hover:text-destructive rounded-lg p-1.5 transition"
                                                      >
                                                          <Trash2 className="size-4" />
                                                      </button>
                                                  </div>
                                              )}
                                    </li>
                                );
                            })}
                        </ul>

                        {filtered.length === 0 && (
                            <p className="bg-surface text-muted-foreground mt-2.5 rounded-2xl px-4 py-3 text-xs">Tidak ada peserta di filter ini.</p>
                        )}

                        {can.manage && (
                            <form onSubmit={addParticipant} className="mt-3 flex gap-2">
                                <Input
                                    value={newName}
                                    onChange={(event) => setNewName(event.target.value)}
                                    placeholder="Tambah peserta"
                                    aria-label="Tambah peserta"
                                    className="h-11 rounded-xl"
                                />
                                <Button type="submit" className="h-11 shrink-0 rounded-xl px-4" disabled={addingParticipant} aria-label="Tambah">
                                    <Plus className="size-4" />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 shrink-0 rounded-xl px-4"
                                    aria-label="Tempel daftar nama dari chat"
                                    onClick={() => setPasting(true)}
                                >
                                    <ClipboardPaste className="size-4" />
                                </Button>
                            </form>
                        )}
                    </section>

                    {can.close && (
                        <div className="mt-6">
                            {isOpen ? (
                                <Button variant="outline" className="h-11 rounded-xl text-sm font-semibold" onClick={() => setClosing(true)}>
                                    <Lock className="size-4" />
                                    Tutup patungan
                                </Button>
                            ) : (
                                patungan.status === 'CLOSED' && (
                                    <Button
                                        variant="outline"
                                        className="h-11 rounded-xl text-sm font-semibold"
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
            </div>

            <PasteNamesSheet open={pasting} onOpenChange={setPasting} onConfirm={addPastedNames} />

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
