import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { Head } from '@inertiajs/react';
import { LinkIcon } from 'lucide-react';

/**
 * A personal link that does not resolve.
 *
 * Says nothing about why. Whether the token never existed, was revoked, or
 * belongs to a different patungan, the answer is identical - anything more
 * specific would turn this page into a way of testing guesses.
 *
 * The group link is offered instead, because the most common cause is somebody
 * pasting a truncated URL out of a WhatsApp message, and from there they can
 * find their own name.
 */
export default function PersonalInvalid({ patungan_url }: { patungan_url: string }) {
    return (
        <PublicLayout>
            <Head title="Link tidak valid" />

            <section className="border-border bg-card rounded-3xl border p-8 text-center">
                <span className="bg-muted text-muted-foreground mx-auto flex size-14 items-center justify-center rounded-2xl">
                    <LinkIcon className="size-6" />
                </span>

                <h1 className="mt-5 text-base font-bold tracking-tight">Link pembayaran tidak valid</h1>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                    Link personalnya mungkin kepotong waktu di-copy. Coba buka patungannya lalu pilih nama kamu.
                </p>

                <Button asChild className="mt-6 h-12 w-full rounded-2xl text-sm font-semibold">
                    <a href={patungan_url}>Buka patungan</a>
                </Button>
            </section>
        </PublicLayout>
    );
}
