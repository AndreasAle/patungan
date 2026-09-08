import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { useMemo, type FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { GoogleButton } from '@/components/patungan/google-button';
import { PasswordInput } from '@/components/patungan/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';
import { suggestEmail } from '@/lib/email-hint';

interface RegisterForm {
    [key: string]: string | boolean;
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm<RegisterForm>({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    // A typo like gmial.com is a real domain, so only the user can tell us.
    const suggestion = useMemo(() => suggestEmail(data.email), [data.email]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout title="Bikin akun" description="Isi data kamu buat bikin akun">
            <Head title="Daftar" />

            <GoogleButton label="Daftar dengan Google" />

            <form className="flex flex-col gap-4" onSubmit={submit}>
                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="name">Nama</Label>
                        <Input
                            id="name"
                            type="text"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="name"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            disabled={processing}
                            placeholder="Nama lengkap"
                            className="h-12 rounded-xl"
                        />
                        <InputError message={errors.name} className="mt-2" />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            tabIndex={2}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            disabled={processing}
                            placeholder="email@kamu.com"
                            className="h-12 rounded-xl"
                        />
                        <InputError message={errors.email} />

                        {suggestion && !errors.email && (
                            <p className="text-muted-foreground text-[11px]">
                                Maksud kamu{' '}
                                <button type="button" onClick={() => setData('email', suggestion)} className="text-primary font-semibold underline">
                                    {suggestion}
                                </button>
                                ?
                            </p>
                        )}
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="password">Password</Label>
                        <PasswordInput
                            id="password"
                            required
                            showStrength
                            tabIndex={3}
                            autoComplete="new-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            disabled={processing}
                            placeholder="Password"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="password_confirmation">Ulangi password</Label>
                        <PasswordInput
                            id="password_confirmation"
                            required
                            tabIndex={4}
                            autoComplete="new-password"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            disabled={processing}
                            placeholder="Ulangi password"
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <Button type="submit" className="h-12 w-full rounded-full text-sm font-semibold" tabIndex={5} disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Daftar
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-xs">
                    Sudah punya akun?{' '}
                    <TextLink href={route('login')} className="text-primary font-semibold" tabIndex={6}>
                        Log in
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
