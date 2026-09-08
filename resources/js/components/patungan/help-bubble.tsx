import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { Check, LoaderCircle, MessageCircle, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';

type Errors = Partial<Record<'name' | 'contact' | 'message', string>>;

/**
 * The CSRF token Laravel issues as a cookie.
 *
 * The layout carries no meta tag, so the cookie is the only source. It arrives
 * URL encoded and has to be decoded before it will match.
 */
function csrfToken(): string {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

/**
 * The help bubble, pinned bottom right.
 *
 * It leaves a message rather than pretending to be a live chat: nobody is
 * waiting on the other end, and a chat window that never answers is worse than
 * a form that says when a reply will come.
 *
 * It is deliberately open to people with no account. The person most likely to
 * need help is a payer whose QRIS will not settle, and they have no other way
 * to reach anyone.
 */
export function HelpBubble({ className }: { className?: string }) {
    const [open, setOpen] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [errors, setErrors] = useState<Errors>({});
    const [failed, setFailed] = useState<string | null>(null);

    const panel = useRef<HTMLDivElement>(null);
    const firstField = useRef<HTMLInputElement>(null);
    const user = usePage<SharedData>().props.auth?.user;

    const [form, setForm] = useState({ name: '', contact: '', message: '' });

    // Prefill from the signed-in account: an organizer should not retype what
    // we already know about them.
    useEffect(() => {
        if (!user) return;

        setForm((current) => ({
            ...current,
            name: current.name || user.name || '',
            contact: current.contact || user.email || '',
        }));
    }, [user]);

    useEffect(() => {
        if (!open) return;

        firstField.current?.focus();

        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };

        const onClickAway = (event: MouseEvent) => {
            if (panel.current && !panel.current.contains(event.target as Node)) setOpen(false);
        };

        document.addEventListener('keydown', onKey);
        // Deferred, or the click that opened the panel would close it again.
        const timer = window.setTimeout(() => document.addEventListener('mousedown', onClickAway), 0);

        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onClickAway);
            window.clearTimeout(timer);
        };
    }, [open]);

    const submit = async (event: FormEvent) => {
        event.preventDefault();

        setSending(true);
        setErrors({});
        setFailed(null);

        try {
            const response = await fetch(route('support.store'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': csrfToken(),
                },
                credentials: 'same-origin',
                body: JSON.stringify({ ...form, page: window.location.pathname }),
            });

            if (response.status === 422) {
                const body = await response.json();
                setErrors(Object.fromEntries(Object.entries(body.errors ?? {}).map(([key, list]) => [key, (list as string[])[0]])));

                return;
            }

            if (response.status === 419) {
                setFailed('Sesi kamu kedaluwarsa. Muat ulang halaman lalu kirim lagi.');

                return;
            }

            if (response.status === 429) {
                setFailed('Terlalu banyak pesan dalam waktu singkat. Coba lagi beberapa menit lagi.');

                return;
            }

            if (!response.ok) {
                setFailed('Pesan belum bisa dikirim. Coba lagi sebentar lagi.');

                return;
            }

            setSent(true);
            setForm((current) => ({ ...current, message: '' }));
        } catch {
            // A dropped connection is the likeliest cause, and it is not the
            // sender's fault - so say what to do rather than what went wrong.
            setFailed('Koneksi terputus. Coba kirim lagi.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className={cn('pb-safe fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 print:hidden', className)}>
            {open && (
                <div
                    ref={panel}
                    role="dialog"
                    aria-label="Butuh bantuan"
                    className="border-border bg-card w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border shadow-[0_16px_50px_rgba(16,66,44,0.18)]"
                >
                    <div className="surface-deep flex items-start gap-3 px-5 py-4">
                        <AppLogoIcon className="size-9 shrink-0" plate />
                        <div className="min-w-0 flex-1">
                            <p className="text-brand-deep-foreground text-sm font-bold tracking-tight">Butuh bantuan?</p>
                            <p className="text-brand-deep-muted mt-0.5 text-[11px] leading-relaxed">
                                Tinggalkan pesan, admin kami balas lewat kontak kamu.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            aria-label="Tutup"
                            className="text-brand-deep-foreground/80 hover:text-brand-deep-foreground -mr-1 rounded-lg p-1 transition"
                        >
                            <X className="size-4" />
                        </button>
                    </div>

                    {sent ? (
                        <div className="px-5 py-8 text-center">
                            <span className="bg-success-soft text-success mx-auto flex size-11 items-center justify-center rounded-2xl">
                                <Check className="size-5" strokeWidth={2.6} />
                            </span>
                            <p className="mt-4 text-sm font-bold tracking-tight">Pesan kamu sudah masuk</p>
                            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                                Kami balas lewat kontak yang kamu tinggalkan. Biasanya dalam 1×24 jam.
                            </p>
                            <Button variant="outline" className="mt-5 h-10 rounded-full px-5 text-xs font-semibold" onClick={() => setSent(false)}>
                                Kirim pesan lain
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="space-y-3 px-5 py-5">
                            {failed && <p className="bg-destructive/10 text-destructive rounded-xl px-3 py-2 text-[11px] font-medium">{failed}</p>}

                            <div>
                                <Label htmlFor="help-name" className="text-xs">
                                    Nama
                                </Label>
                                <Input
                                    id="help-name"
                                    ref={firstField}
                                    value={form.name}
                                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                                    placeholder="Nama kamu"
                                    className="mt-1.5 h-11 rounded-xl"
                                    required
                                    maxLength={80}
                                />
                                {errors.name && <p className="text-destructive mt-1 text-[11px]">{errors.name}</p>}
                            </div>

                            <div>
                                <Label htmlFor="help-contact" className="text-xs">
                                    Email atau WhatsApp
                                </Label>
                                <Input
                                    id="help-contact"
                                    value={form.contact}
                                    onChange={(event) => setForm({ ...form, contact: event.target.value })}
                                    placeholder="Biar kami bisa balas"
                                    className="mt-1.5 h-11 rounded-xl"
                                    required
                                    maxLength={120}
                                />
                                {errors.contact && <p className="text-destructive mt-1 text-[11px]">{errors.contact}</p>}
                            </div>

                            <div>
                                <Label htmlFor="help-message" className="text-xs">
                                    Pesan
                                </Label>
                                <textarea
                                    id="help-message"
                                    value={form.message}
                                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                                    placeholder="Ceritakan kendalanya"
                                    rows={4}
                                    required
                                    minLength={10}
                                    maxLength={2000}
                                    className="border-input bg-background focus-visible:ring-ring mt-1.5 w-full resize-none rounded-xl border px-3 py-2.5 text-sm focus-visible:ring-2 focus-visible:outline-none"
                                />
                                {errors.message && <p className="text-destructive mt-1 text-[11px]">{errors.message}</p>}
                            </div>

                            <Button type="submit" disabled={sending} className="h-11 w-full rounded-full text-sm font-semibold">
                                {sending && <LoaderCircle className="size-4 animate-spin" />}
                                {sending ? 'Mengirim...' : 'Kirim pesan'}
                            </Button>
                        </form>
                    )}
                </div>
            )}

            <button
                type="button"
                onClick={() => setOpen((shown) => !shown)}
                aria-expanded={open}
                aria-label={open ? 'Tutup bantuan' : 'Butuh bantuan?'}
                className="surface-deep ring-card flex size-14 items-center justify-center rounded-full shadow-[0_10px_30px_rgba(16,66,44,0.32)] ring-4 transition active:scale-95"
            >
                {open ? (
                    <X className="text-brand-deep-foreground size-5" />
                ) : (
                    <span className="relative">
                        <AppLogoIcon className="size-8" plate />
                        {/* A small mark so the bubble reads as "talk to someone",
                            not as the logo dropped in the corner by mistake. */}
                        <span className="bg-lime text-lime-foreground absolute -right-2 -bottom-1.5 flex size-4 items-center justify-center rounded-full">
                            <MessageCircle className="size-2.5" strokeWidth={3} />
                        </span>
                    </span>
                )}
            </button>
        </div>
    );
}
