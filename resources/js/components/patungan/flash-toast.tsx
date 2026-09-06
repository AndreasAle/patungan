import type { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

/** Surfaces the session flash messages set by the controllers. */
export function FlashToast() {
    const { flash } = usePage<SharedData>().props;
    const [visible, setVisible] = useState(false);

    const message = flash?.success ?? flash?.error ?? null;
    const isError = Boolean(flash?.error);

    useEffect(() => {
        if (!message) return;

        setVisible(true);
        const timer = window.setTimeout(() => setVisible(false), 4000);

        return () => window.clearTimeout(timer);
    }, [message]);

    if (!message || !visible) return null;

    return (
        <div className="fixed inset-x-4 top-4 z-[60] mx-auto max-w-sm sm:right-4 sm:left-auto sm:mx-0">
            <div
                role="status"
                className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-lg ${
                    isError ? 'border-destructive/30 bg-card text-destructive' : 'border-success/30 bg-card text-success'
                }`}
            >
                {isError ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
                <p className="text-foreground flex-1 text-sm font-medium">{message}</p>
                <button type="button" onClick={() => setVisible(false)} aria-label="Tutup notifikasi" className="text-muted-foreground">
                    <X className="size-4" />
                </button>
            </div>
        </div>
    );
}
