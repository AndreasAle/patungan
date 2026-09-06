import AppLogoIcon from '@/components/app-logo-icon';
import * as Dialog from '@radix-ui/react-dialog';
import { ArrowRight, ShieldCheck, Users, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Bump this when the message changes, so returning users see the new one. */
const STORAGE_KEY = 'patungan.welcome.v1';

const highlights = [
    { icon: ShieldCheck, label: 'Aman' },
    { icon: Zap, label: 'Mudah' },
    { icon: Users, label: 'Transparan' },
];

/**
 * A one-time hello from the developer for the first wave of users.
 *
 * "Jangan tampilkan lagi" is remembered in this browser; "Tutup" only hides it
 * for the current session. Storage access is guarded because private windows
 * can throw on both read and write.
 */
export function WelcomeDialog() {
    const [open, setOpen] = useState(false);
    const [photoLoaded, setPhotoLoaded] = useState(false);

    useEffect(() => {
        try {
            if (window.localStorage.getItem(STORAGE_KEY) === null) {
                setOpen(true);
            }
        } catch {
            // Storage blocked - show it once for this page view rather than never.
            setOpen(true);
        }
    }, []);

    const dismissForever = () => {
        try {
            window.localStorage.setItem(STORAGE_KEY, 'dismissed');
        } catch {
            // Nothing to persist to; closing is still the right outcome.
        }

        setOpen(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Portal>
                <Dialog.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-[70] bg-[hsl(158_40%_6%_/_0.55)] backdrop-blur-[3px]" />

                <Dialog.Content className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 bg-card fixed top-1/2 left-1/2 z-[70] w-[calc(100vw-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[28px] shadow-2xl">
                    <div className="relative overflow-hidden px-5 pt-5 pb-4">
                        {/* Soft brand blobs, echoing the launch card. */}
                        <span aria-hidden="true" className="bg-brand-soft absolute -top-16 -right-12 size-44 rounded-full opacity-70" />
                        <span aria-hidden="true" className="bg-lime/25 absolute -bottom-24 -left-16 size-44 rounded-full" />

                        {/*
                          Cut-out founder photo, bottom aligned so it reads as part of the
                          card rather than a pasted thumbnail. It stays hidden until it
                          actually loads, so a missing file leaves no broken placeholder.
                        */}
                        <img
                            src="/images/founder.png"
                            alt=""
                            hidden={!photoLoaded}
                            onLoad={() => setPhotoLoaded(true)}
                            className="pointer-events-none absolute right-0 -bottom-1 z-[1] w-32 select-none"
                        />

                        <div className="relative z-[2]">
                            <div className="flex items-center justify-between gap-2">
                                <AppLogoIcon className="size-8" />
                                <span className="chip bg-brand-soft text-primary">
                                    <Users className="size-3" />
                                    100 Pengguna Pertama
                                </span>
                            </div>

                            {/* Leave room on the right once the photo is in place. */}
                            <div className={photoLoaded ? 'pr-24' : undefined}>
                                <Dialog.Title className="text-primary mt-4 text-xl leading-tight font-extrabold tracking-tight">
                                    Halo, saya Andreas 👋
                                </Dialog.Title>

                                <Dialog.Description className="text-muted-foreground mt-2 text-xs leading-relaxed">
                                    Saya developer Patungan. Kamu masuk sebagai 100 pengguna pertama yang mencoba aplikasi ini. Silakan pakai semua
                                    fiturnya dengan aman — saya akan terus memantau dan mengembangkannya biar makin nyaman dipakai.
                                </Dialog.Description>
                            </div>

                            <ul className="mt-5 flex items-center justify-between gap-2">
                                {highlights.map((highlight) => (
                                    <li key={highlight.label} className="flex flex-1 flex-col items-center gap-1.5">
                                        <span className="bg-brand-soft text-primary flex size-10 items-center justify-center rounded-full">
                                            <highlight.icon className="size-[18px]" strokeWidth={2.2} />
                                        </span>
                                        <span className="text-foreground text-[11px] font-bold">{highlight.label}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="bg-primary text-primary-foreground mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold transition active:scale-[0.98]"
                            >
                                Mulai Pakai Sekarang
                                <ArrowRight className="size-4" strokeWidth={2.5} />
                            </button>

                            <p className="text-muted-foreground mt-3 text-center text-[11px]">Terima kasih sudah ikut dari awal.</p>
                        </div>
                    </div>

                    <div className="border-border divide-border grid grid-cols-2 divide-x border-t">
                        <button
                            type="button"
                            onClick={dismissForever}
                            className="text-muted-foreground hover:bg-surface h-12 text-xs font-semibold transition"
                        >
                            Jangan tampilkan lagi
                        </button>
                        <button
                            type="button"
                            onClick={() => setOpen(false)}
                            className="text-foreground hover:bg-surface h-12 text-xs font-semibold transition"
                        >
                            Tutup
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
