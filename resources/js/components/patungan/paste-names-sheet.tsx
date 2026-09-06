import { BottomSheet } from '@/components/patungan/bottom-sheet';
import { Button } from '@/components/ui/button';
import { parseNames, type ParsedName } from '@/lib/parse-names';
import { cn } from '@/lib/utils';
import { Check, ClipboardPaste } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface PasteNamesSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (names: ParsedName[]) => void;
    /** Pre-fills the box when the sheet was opened by pasting into the quick field. */
    initialText?: string;
}

/**
 * Paste a line-up straight from a group chat. Detected names are previewed and
 * can be unticked before they are added, so a stray heading never becomes a
 * participant who owes money.
 */
export function PasteNamesSheet({ open, onOpenChange, onConfirm, initialText = '' }: PasteNamesSheetProps) {
    const [raw, setRaw] = useState(initialText);
    const [excluded, setExcluded] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (open && initialText !== '') {
            setRaw(initialText);
            setExcluded(new Set());
        }
    }, [open, initialText]);

    const detected = useMemo(() => parseNames(raw), [raw]);
    const selected = detected.filter((_, index) => !excluded.has(index));

    const toggle = (index: number) => {
        setExcluded((current) => {
            const next = new Set(current);

            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }

            return next;
        });
    };

    const reset = () => {
        setRaw('');
        setExcluded(new Set());
    };

    const confirm = () => {
        onConfirm(selected);
        reset();
        onOpenChange(false);
    };

    return (
        <BottomSheet
            open={open}
            onOpenChange={(next) => {
                if (!next) reset();
                onOpenChange(next);
            }}
            title="Tempel daftar nama"
            description="Copy daftar dari grup, tempel di sini. Nomor urut dan judul tim otomatis dibuang."
        >
            <textarea
                value={raw}
                onChange={(event) => {
                    setRaw(event.target.value);
                    setExcluded(new Set());
                }}
                rows={6}
                autoFocus
                placeholder={'Tim A (baju ijo)\n1. ando\n2. jodi\n3. fafa (kiper)'}
                className="border-input bg-background placeholder:text-muted-foreground/70 focus-visible:ring-ring w-full resize-none rounded-xl border px-3 py-2.5 text-sm leading-relaxed focus-visible:ring-2 focus-visible:outline-none"
                aria-label="Daftar nama dari chat"
            />

            {raw.trim() !== '' && (
                <div className="mt-3">
                    <p className="text-muted-foreground text-xs">
                        {detected.length === 0 ? (
                            'Belum ada nama yang terbaca.'
                        ) : (
                            <>
                                Terbaca <span className="text-foreground font-semibold">{detected.length} nama</span>. Ketuk untuk membatalkan yang
                                bukan peserta.
                            </>
                        )}
                    </p>

                    {detected.length > 0 && (
                        <ul className="mt-2 flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
                            {detected.map((entry, index) => {
                                const active = !excluded.has(index);

                                return (
                                    <li key={`${entry.name}-${index}`}>
                                        <button
                                            type="button"
                                            onClick={() => toggle(index)}
                                            aria-pressed={active}
                                            className={cn(
                                                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium transition',
                                                active
                                                    ? 'border-primary/30 bg-brand-soft text-primary'
                                                    : 'border-border text-muted-foreground line-through',
                                            )}
                                        >
                                            {active && <Check className="size-3" strokeWidth={3} />}
                                            {entry.name}
                                            {entry.note && <span className="opacity-70">· {entry.note}</span>}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}

            <Button className="mt-4 h-11 w-full rounded-xl text-sm font-semibold" disabled={selected.length === 0} onClick={confirm}>
                <ClipboardPaste className="size-4" />
                {selected.length === 0 ? 'Tambahkan peserta' : `Tambahkan ${selected.length} peserta`}
            </Button>
        </BottomSheet>
    );
}
