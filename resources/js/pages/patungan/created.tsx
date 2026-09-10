import { CategoryIcon } from '@/components/patungan/category-icon';
import { Button } from '@/components/ui/button';
import PatunganLayout from '@/layouts/patungan-layout';
import { rupiah } from '@/lib/format';
import { copyText, shareMessage } from '@/lib/share';
import { cn } from '@/lib/utils';
import { Head, Link, router } from '@inertiajs/react';
import { ArrowRight, Check, Copy, Users } from 'lucide-react';
import { useState } from 'react';

interface Props {
    patungan: {
        uuid: string;
        title: string;
        category: string;
        category_label: string;
        participant_count: number;
        equal_amount: number | null;
        target_amount: number;
        split_type: string;
    };
    share: { public_url: string; invite: string };
}

/**
 * The screen between creating a patungan and putting it in a group chat.
 *
 * Deliberately almost empty. The organizer has one job at this moment and the
 * page has one button; the administrative detail view is a small grey link
 * underneath, because that is where they go later when something goes wrong,
 * not now.
 */
export default function PatunganCreated({ patungan, share }: Props) {
    const [copied, setCopied] = useState(false);

    const record = (type: string, channel = 'whatsapp') => {
        router.post(route('share.record', patungan.uuid), { type, channel }, { preserveState: true, preserveScroll: true, only: [] });
    };

    const sendToWhatsApp = async () => {
        if (await shareMessage(share.invite)) {
            record('GROUP_INVITE');
        }
    };

    const copyLink = async () => {
        const didCopy = await copyText(share.public_url);
        setCopied(didCopy);
        if (didCopy) record('GROUP_INVITE', 'clipboard');
        window.setTimeout(() => setCopied(false), 2000);
    };

    return (
        <PatunganLayout title="Berhasil dibuat">
            <Head title="Patungan berhasil dibuat" />

            <div className="mx-auto w-full max-w-md">
                <div className="text-center">
                    <span className="bg-success-soft text-success mx-auto flex size-14 items-center justify-center rounded-2xl">
                        <Check className="size-7" strokeWidth={2.8} />
                    </span>
                    <p className="text-muted-foreground mt-5 text-[11px] font-bold tracking-[0.16em] uppercase">Patungan berhasil dibuat</p>
                </div>

                <section className="border-border bg-card mt-5 rounded-3xl border p-5 text-center">
                    <CategoryIcon category={patungan.category} className="mx-auto" />
                    <h1 className="display mt-3 text-xl">{patungan.title}</h1>

                    <dl className="divide-border mt-5 grid grid-cols-3 divide-x">
                        <div>
                            <dt className="text-muted-foreground text-[11px]">Peserta</dt>
                            <dd className="mt-1 text-sm font-bold tabular-nums">{patungan.participant_count} orang</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-[11px]">Per orang</dt>
                            <dd className="mt-1 text-sm font-bold tabular-nums">
                                {patungan.equal_amount ? rupiah(patungan.equal_amount) : 'Beda-beda'}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-[11px]">Target</dt>
                            <dd className="mt-1 text-sm font-bold tabular-nums">{rupiah(patungan.target_amount)}</dd>
                        </div>
                    </dl>
                </section>

                {/* The one thing to do next, and it is not subtle. */}
                <Button onClick={sendToWhatsApp} className="mt-5 h-14 w-full rounded-2xl text-base font-bold">
                    <Users className="size-5" />
                    Bagikan ke WhatsApp
                </Button>

                <button
                    type="button"
                    onClick={copyLink}
                    className={cn(
                        'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold transition',
                        copied ? 'text-success' : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? 'Link tersalin' : 'Salin link'}
                </button>

                <div className="bg-muted mt-4 rounded-2xl px-4 py-3">
                    <p className="text-muted-foreground truncate text-center font-mono text-[11px]">{share.public_url}</p>
                </div>

                <Link
                    href={route('patungan.show', patungan.uuid)}
                    className="text-muted-foreground hover:text-foreground mt-6 flex items-center justify-center gap-1.5 text-sm font-semibold transition"
                >
                    Lihat detail
                    <ArrowRight className="size-4" />
                </Link>
            </div>
        </PatunganLayout>
    );
}
