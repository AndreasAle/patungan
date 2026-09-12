import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { BadgeCheck, Loader2, ShieldCheck, Smartphone } from 'lucide-react';
import { useState } from 'react';

export interface PhoneState {
    masked: string | null;
    pretty: string | null;
    verified: boolean;
    available: boolean;
    cooldown: number;
}

/**
 * Verifying the number we would warn you on.
 *
 * Worded around what it protects rather than what it is. "Verify your phone" is
 * a chore; "so we can warn you if someone changes your bank account" is a
 * reason. The difference decides whether anybody does it.
 *
 * Hidden entirely when no OTP provider is configured. Offering a button that
 * cannot work is worse than not offering one - it teaches people the app is
 * broken at the exact moment they are deciding whether to trust it with money.
 */
export function PhoneVerificationCard({ phone, coolingHours }: { phone: PhoneState; coolingHours: number }) {
    const [stage, setStage] = useState<'idle' | 'code'>('idle');

    const send = useForm({ phone: phone.pretty ?? '' });
    const confirm = useForm({ code: '' });

    if (!phone.available) return null;

    if (phone.verified) {
        return (
            <div className="border-success/25 bg-success/5 flex items-center gap-3 rounded-2xl border p-4">
                <BadgeCheck className="text-success size-5 shrink-0" strokeWidth={2.3} />
                <div className="min-w-0">
                    <p className="text-sm font-bold">Nomor HP terverifikasi</p>
                    <p className="text-muted-foreground text-xs">Kami akan mengabari {phone.masked} kalau ada rekening pencairan baru ditambahkan.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="border-warning/30 bg-warning/5 rounded-2xl border p-4">
            <div className="flex items-start gap-3">
                <Smartphone className="text-warning mt-0.5 size-5 shrink-0" strokeWidth={2.3} />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">Verifikasi nomor HP kamu</p>
                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                        Supaya kami punya cara mengabari kamu kalau ada yang menambah rekening pencairan baru — meski emailmu yang dipakai. Pencairan
                        juga jadi bisa diproses otomatis.
                    </p>

                    {stage === 'idle' ? (
                        <form
                            className="mt-3 flex flex-wrap gap-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                send.post(route('phone.verify.send'), {
                                    preserveScroll: true,
                                    onSuccess: () => setStage('code'),
                                });
                            }}
                        >
                            <input
                                value={send.data.phone}
                                onChange={(event) => send.setData('phone', event.target.value)}
                                inputMode="tel"
                                placeholder="0812 3456 7890"
                                aria-label="Nomor HP"
                                className="border-input bg-background h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm"
                            />
                            <button
                                type="submit"
                                disabled={send.processing}
                                className="bg-brand-deep text-brand-deep-foreground flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-60"
                            >
                                {send.processing && <Loader2 className="size-4 animate-spin" />}
                                Kirim kode
                            </button>
                        </form>
                    ) : (
                        <form
                            className="mt-3 flex flex-wrap gap-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                confirm.post(route('phone.verify.confirm'), {
                                    preserveScroll: true,
                                    onSuccess: () => setStage('idle'),
                                });
                            }}
                        >
                            <input
                                value={confirm.data.code}
                                onChange={(event) => confirm.setData('code', event.target.value)}
                                inputMode="numeric"
                                maxLength={6}
                                placeholder="6 digit"
                                aria-label="Kode verifikasi"
                                className="border-input bg-background h-11 w-32 rounded-xl border px-3 text-center text-sm tracking-[0.3em]"
                            />
                            <button
                                type="submit"
                                disabled={confirm.processing}
                                className="bg-brand-deep text-brand-deep-foreground flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold disabled:opacity-60"
                            >
                                {confirm.processing && <Loader2 className="size-4 animate-spin" />}
                                Verifikasi
                            </button>
                            <button type="button" onClick={() => setStage('idle')} className="text-muted-foreground h-11 px-2 text-xs font-semibold">
                                Ganti nomor
                            </button>
                        </form>
                    )}

                    {(send.errors.phone || confirm.errors.code) && (
                        <p className="text-destructive mt-2 text-xs font-semibold">{send.errors.phone ?? confirm.errors.code}</p>
                    )}

                    <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-[11px]">
                        <ShieldCheck className="size-3.5" />
                        Rekening yang baru ditambahkan tetap menunggu {coolingHours} jam sebelum bisa cair otomatis.
                    </p>
                </div>
            </div>
        </div>
    );
}

/** Why one payout is waiting for a person, stated where the organizer sees it. */
export function ReviewReasons({ reasons, className }: { reasons: string[]; className?: string }) {
    if (reasons.length === 0) return null;

    return (
        <ul className={cn('text-muted-foreground mt-1.5 space-y-0.5 text-[11px]', className)}>
            {reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
            ))}
        </ul>
    );
}
