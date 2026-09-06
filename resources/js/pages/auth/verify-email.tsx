import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import AuthLayout from '@/layouts/auth-layout';
import type { SharedData } from '@/types';
import { Head, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle, MailCheck } from 'lucide-react';
import type { FormEventHandler } from 'react';

export default function VerifyEmail({ status }: { status?: string }) {
    const email = usePage<SharedData>().props.auth.user?.email;
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        post(route('verification.send'));
    };

    return (
        <AuthLayout title="Cek email kamu" description="Satu langkah lagi sebelum bisa mulai bikin patungan.">
            <Head title="Verifikasi email" />

            <div className="bg-surface flex flex-col items-center rounded-2xl px-5 py-6 text-center">
                <span className="bg-brand-soft text-primary flex size-12 items-center justify-center rounded-2xl">
                    <MailCheck className="size-5" />
                </span>

                <p className="text-muted-foreground mt-3.5 text-xs leading-relaxed">
                    Kami sudah mengirim link verifikasi ke
                    {email ? (
                        <>
                            {' '}
                            <span className="text-foreground font-semibold">{email}</span>.
                        </>
                    ) : (
                        ' email kamu.'
                    )}{' '}
                    Buka emailnya lalu klik linknya.
                </p>
            </div>

            {status === 'verification-link-sent' && (
                <p className="bg-success-soft text-success mt-3 rounded-xl px-3 py-2.5 text-center text-xs font-semibold">
                    Link verifikasi baru sudah dikirim.
                </p>
            )}

            <form onSubmit={submit} className="mt-4">
                <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold" disabled={processing}>
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    Kirim ulang link verifikasi
                </Button>
            </form>

            <p className="text-muted-foreground mt-4 text-center text-[11px] leading-relaxed">
                Tidak ada emailnya? Cek folder spam, atau{' '}
                <TextLink href={route('profile.edit')} className="text-primary font-semibold">
                    ganti alamat emailnya
                </TextLink>
                .
            </p>

            <TextLink href={route('logout')} method="post" className="text-muted-foreground mx-auto mt-4 block text-center text-[11px]">
                Keluar
            </TextLink>
        </AuthLayout>
    );
}
