import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { LoaderCircle, MailCheck } from 'lucide-react';
import { useEffect, useState, type FormEventHandler } from 'react';

interface VerifyEmailProps {
    email: string;
    /** Seconds left before another code may be requested. */
    cooldown: number;
    minutes: number;
    status?: string;
}

export default function VerifyEmail({ email, cooldown, minutes, status }: VerifyEmailProps) {
    const errors = usePage().props.errors as Record<string, string>;
    const [waitFor, setWaitFor] = useState(cooldown);

    const { data, setData, post, processing } = useForm({ code: '' });
    const resendForm = useForm({});

    useEffect(() => setWaitFor(cooldown), [cooldown]);

    useEffect(() => {
        if (waitFor <= 0) return;

        const timer = window.setInterval(() => setWaitFor((left) => Math.max(0, left - 1)), 1000);

        return () => window.clearInterval(timer);
    }, [waitFor]);

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('verification.confirm'));
    };

    const resend: FormEventHandler = (event) => {
        event.preventDefault();
        resendForm.post(route('verification.send'), { onSuccess: () => setWaitFor(60) });
    };

    return (
        <AuthLayout title="Cek email kamu" description="Satu langkah lagi sebelum bisa mulai bikin patungan.">
            <Head title="Verifikasi email" />

            <div className="bg-surface flex flex-col items-center rounded-2xl px-5 py-5 text-center">
                <span className="bg-brand-soft text-primary flex size-11 items-center justify-center rounded-2xl">
                    <MailCheck className="size-5" />
                </span>
                <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                    Kami mengirim kode 6 digit ke <span className="text-foreground font-semibold">{email}</span>. Berlaku {minutes} menit.
                </p>
            </div>

            {status === 'verification-code-sent' && (
                <p className="bg-success-soft text-success mt-3 rounded-xl px-3 py-2.5 text-center text-xs font-semibold">Kode baru sudah dikirim.</p>
            )}

            <form onSubmit={submit} className="mt-4">
                <Label htmlFor="code" className="sr-only">
                    Kode verifikasi
                </Label>
                <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    value={data.code}
                    onChange={(event) => setData('code', event.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="h-14 rounded-xl text-center text-xl font-bold tracking-[0.4em] tabular-nums"
                />
                {errors.code && <p className="text-destructive mt-2 text-center text-xs font-medium">{errors.code}</p>}

                <Button type="submit" className="mt-4 h-11 w-full rounded-xl text-sm font-semibold" disabled={processing || data.code.length < 6}>
                    {processing && <LoaderCircle className="size-4 animate-spin" />}
                    Verifikasi
                </Button>
            </form>

            <form onSubmit={resend} className="mt-3">
                <Button
                    type="submit"
                    variant="ghost"
                    className="h-10 w-full rounded-xl text-xs font-semibold"
                    disabled={resendForm.processing || waitFor > 0}
                >
                    {waitFor > 0 ? `Kirim ulang kode (${waitFor}s)` : 'Kirim ulang kode'}
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
