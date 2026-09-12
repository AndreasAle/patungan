import { CategoryIcon } from '@/components/patungan/category-icon';
import { ConfirmDialog } from '@/components/patungan/confirm-dialog';
import { PasteNamesSheet } from '@/components/patungan/paste-names-sheet';
import { PatunganActions, type ShareBundle } from '@/components/patungan/patungan-actions';
import { ProgressBar } from '@/components/patungan/progress-bar';
import { Eyebrow, PanelHeading } from '@/components/patungan/section-heading';
import { ShareRoomInvite } from '@/components/patungan/share-room-invite';
import { ShareSheet } from '@/components/patungan/share-sheet';
import { StatusBadge } from '@/components/patungan/status-badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PatunganLayout from '@/layouts/patungan-layout';
import { formatDateTime, formatTime, rupiah } from '@/lib/format';
import type { ParsedName } from '@/lib/parse-names';
import { cn } from '@/lib/utils';
import type { OrganizerParticipant, PatunganDetail } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { BellRing, Check, ClipboardPaste, Clock, DoorClosed, Lock, LockOpen, Plus, ReceiptText, Repeat2, Settings2, Trash2 } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';

type Filter = 'ALL' | 'PAID' | 'UNPAID';

interface ShowProps {
    patungan: PatunganDetail;
    can: { manage: boolean; close: boolean; delete: boolean };
    share: ShareBundle;
    organizer_name: string;
}

const filters: [Filter, string][] = [
    ['ALL', 'Semua'],
    ['PAID', 'Sudah bayar'],
    ['UNPAID', 'Belum bayar'],
];

export default function PatunganShow({ patungan, can, share, organizer_name }: ShowProps) {
    const [filter, setFilter] = useState<Filter>('ALL');
    const [closing, setClosing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [removing, setRemoving] = useState<OrganizerParticipant | null>(null);
    const [newName, setNewName] = useState('');
    const [addingParticipant, setAddingParticipant] = useState(false);
    const [pasting, setPasting] = useState(false);
    const [personal, setPersonal] = useState<{ name: string; message: string } | null>(null);

    /**
     * Asks the server for this participant's own payment link.
     *
     * Fetched rather than shipped with the page because issuing the token is a
     * side effect: a participant nobody ever chases never gets one, and a
     * credential that was never minted cannot leak.
     */
    const chase = async (participant: OrganizerParticipant) => {
        try {
            const response = await fetch(route('share.personal', [patungan.uuid, participant.uuid]), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
                },
                credentials: 'same-origin',
            });

            if (!response.ok) return;

            const body = await response.json();
            setPersonal({ name: body.participant, message: body.message });
        } catch {
            // A dropped connection: the organizer can tap again.
        }
    };

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
                            {patungan.is_private_room && (
                                <span className="chip bg-lime text-lime-foreground mb-1.5">
                                    <DoorClosed className="size-3" />
                                    Private room
                                </span>
                            )}
                            <h1 className="display text-brand-deep-foreground truncate text-lg sm:text-xl">{patungan.title}</h1>
                            <p className="text-brand-deep-muted mt-0.5 truncate text-xs">
                                {patungan.split_type === 'EQUAL' && patungan.equal_amount
                                    ? `${rupiah(patungan.equal_amount)} / orang`
                                    : 'Nominal tiap orang berbeda'}
                            </p>
                        </div>
                        <StatusBadge status={patungan.status} label={patungan.status_label} />
                    </div>

                    <div className="border-brand-deep-muted/25 mt-6 border-t pt-5">
                        <Eyebrow onDeep>Terkumpul</Eyebrow>
                        <p className="display text-brand-deep-foreground mt-3 text-[29px] tabular-nums sm:text-5xl">
                            {rupiah(patungan.collected_amount)}
                        </p>
                        <p className="text-brand-deep-muted mt-2 text-[11px]">dari {rupiah(patungan.target_amount)}</p>

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

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-6">
                <div className="lg:order-2">
                    {patungan.is_private_room ? (
                        <div className="border-border bg-card rounded-3xl border p-5">
                            <PanelHeading>Bagikan per peserta</PanelHeading>
                            <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
                                Linknya sama untuk semua, tapi PIN-nya beda tiap orang. Pakai tombol Salin undangan di masing-masing peserta biar link
                                dan PIN-nya ikut lengkap.
                            </p>
                            <div className="bg-surface mt-4 flex items-center gap-2 rounded-2xl px-3 py-2.5">
                                <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-[11px]">{patungan.public_url}</span>
                            </div>
                        </div>
                    ) : (
                        <PatunganActions uuid={patungan.uuid} share={share} />
                    )}
                </div>

                <div className="lg:order-1">
                    {patungan.description && (
                        <p className="text-muted-foreground border-border bg-card rounded-3xl border px-4 py-3.5 text-xs leading-relaxed">
                            {patungan.description}
                        </p>
                    )}

                    <section className={cn(patungan.description && 'mt-4')}>
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

                        <ul className="mt-3 space-y-2">
                            {filtered.map((participant) => {
                                const paid = participant.status === 'PAID';
                                const remindable = share.remindable.includes(participant.uuid);

                                return (
                                    <li
                                        key={participant.uuid}
                                        className={cn(
                                            'rounded-2xl border px-3.5 py-3',
                                            paid ? 'border-success/20 bg-success-soft/50' : 'border-border bg-card',
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
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
                                                <p className="text-muted-foreground mt-0.5 text-[11px]">
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
                                                          {/* Chasing one person is the common case; marking
                                                              them paid by hand is the exception. */}
                                                          {remindable && (
                                                              <button
                                                                  type="button"
                                                                  onClick={() => chase(participant)}
                                                                  className="border-primary/30 text-primary hover:bg-brand-soft inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-semibold transition"
                                                              >
                                                                  <BellRing className="size-3.5" />
                                                                  Tagih
                                                              </button>
                                                          )}
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
                                        </div>

                                        {can.manage && patungan.is_private_room && (
                                            <ShareRoomInvite
                                                participant={participant}
                                                patunganTitle={patungan.title}
                                                publicUrl={patungan.public_url}
                                                organizerName={organizer_name}
                                            />
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

                    {/*
                        Repeat is above the close/reopen row and looks like a
                        primary action, because for a group that splits the same
                        court fee every week this is the button they came for.
                    */}
                    {!isOpen && (
                        <div className="border-border bg-card mt-6 rounded-3xl border p-4">
                            <p className="text-sm font-bold tracking-tight">Patungan lagi?</p>
                            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                                Bikin yang baru dengan peserta dan nominal yang sama. Pembayaran lama nggak ikut kebawa.
                            </p>
                            <Button
                                className="mt-3.5 h-12 w-full rounded-2xl text-sm font-bold"
                                onClick={() => router.post(route('patungan.repeat', patungan.uuid))}
                            >
                                <Repeat2 className="size-4" />
                                Patungan Lagi
                            </Button>
                        </div>
                    )}

                    {(can.close || can.delete) && (
                        <div className="mt-6 flex flex-wrap gap-2">
                            {can.close && isOpen ? (
                                <Button variant="outline" className="h-11 rounded-full px-6 text-sm font-semibold" onClick={() => setClosing(true)}>
                                    <Lock className="size-4" />
                                    Tutup patungan
                                </Button>
                            ) : (
                                can.close &&
                                patungan.status === 'CLOSED' && (
                                    <Button
                                        variant="outline"
                                        className="h-11 rounded-full px-6 text-sm font-semibold"
                                        onClick={() => router.post(route('patungan.reopen', patungan.uuid), {}, { preserveScroll: true })}
                                    >
                                        <LockOpen className="size-4" />
                                        Buka lagi
                                    </Button>
                                )
                            )}

                            {can.delete && (
                                <Button
                                    variant="outline"
                                    className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive h-11 rounded-full px-6 text-sm font-semibold"
                                    onClick={() => setDeleting(true)}
                                >
                                    <Trash2 className="size-4" />
                                    Hapus patungan
                                </Button>
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
                open={deleting}
                onOpenChange={setDeleting}
                title="Hapus patungan ini?"
                description={`Patungan “${patungan.title}” dan seluruh daftar pesertanya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.`}
                confirmLabel="Ya, hapus"
                destructive
                onConfirm={() => {
                    router.delete(route('patungan.destroy', patungan.uuid), {
                        onFinish: () => setDeleting(false),
                    });
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
            {/* The personal reminder, previewed before it is sent like every
                other message here. */}
            <ShareSheet
                open={personal !== null}
                onClose={() => setPersonal(null)}
                title={personal ? `Tagih ${personal.name}` : 'Tagih'}
                message={personal?.message ?? null}
            />
        </PatunganLayout>
    );
}
