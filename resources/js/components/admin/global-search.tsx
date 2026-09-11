import { router } from '@inertiajs/react';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Item {
    title: string;
    subtitle: string | null;
    href: string;
}

interface Group {
    label: string;
    items: Item[];
}

const MIN_LENGTH = 2;
const DEBOUNCE_MS = 250;

/**
 * One box for every identifier support gets handed.
 *
 * Somebody writes in with a payment reference, or an email, or the name on a
 * bank account, and previously an admin had to guess which of five pages that
 * belonged to before they could look it up. This asks all of them at once.
 *
 * Debounced, and every in-flight request is abandoned when a newer one starts:
 * without that, a slow response for "and" can land after a fast one for
 * "andreas" and overwrite the right answer with a stale one.
 */
export function GlobalSearch() {
    const [term, setTerm] = useState('');
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (term.trim().length < MIN_LENGTH) {
            setGroups([]);
            setLoading(false);

            return;
        }

        const controller = new AbortController();
        setLoading(true);

        const timer = setTimeout(() => {
            fetch(route('admin.search', { q: term }), {
                headers: { Accept: 'application/json' },
                signal: controller.signal,
            })
                .then((response) => (response.ok ? response.json() : { groups: [] }))
                .then((data: { groups: Group[] }) => {
                    setGroups(data.groups ?? []);
                    setLoading(false);
                })
                .catch(() => {
                    // An aborted request is the expected case on every keystroke,
                    // not a failure worth showing anyone.
                    if (!controller.signal.aborted) setLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [term]);

    // Clicking anywhere else puts the panel away.
    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (!container.current?.contains(event.target as Node)) setOpen(false);
        };

        document.addEventListener('mousedown', onClick);

        return () => document.removeEventListener('mousedown', onClick);
    }, []);

    const go = (href: string) => {
        setOpen(false);
        setTerm('');
        router.visit(href);
    };

    const hasResults = groups.some((group) => group.items.length > 0);
    const searched = term.trim().length >= MIN_LENGTH;

    return (
        <div ref={container} className="relative w-full max-w-xs">
            <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <input
                    value={term}
                    onChange={(event) => {
                        setTerm(event.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={(event) => event.key === 'Escape' && setOpen(false)}
                    placeholder="Cari email, referensi, patungan…"
                    aria-label="Cari di seluruh data admin"
                    className="border-input bg-background h-9 w-full rounded-xl border pr-9 pl-9 text-sm"
                />
                {loading && <Loader2 className="text-muted-foreground absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin" />}
            </div>

            {open && searched && (
                <div className="border-border bg-card absolute top-11 right-0 left-0 z-50 max-h-96 overflow-y-auto rounded-2xl border p-2 shadow-xl">
                    {!hasResults && !loading && <p className="text-muted-foreground px-3 py-4 text-xs">Tidak ada yang cocok.</p>}

                    {groups.map((group) => (
                        <div key={group.label} className="mb-1 last:mb-0">
                            <p className="text-muted-foreground px-3 py-1.5 text-[10px] font-bold tracking-[0.14em] uppercase">{group.label}</p>
                            {group.items.map((item) => (
                                <button
                                    key={group.label + item.href + item.title}
                                    type="button"
                                    onClick={() => go(item.href)}
                                    className="hover:bg-muted block w-full rounded-xl px-3 py-2 text-left transition"
                                >
                                    <span className="block truncate text-sm font-semibold">{item.title}</span>
                                    {item.subtitle && <span className="text-muted-foreground block truncate text-[11px]">{item.subtitle}</span>}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
