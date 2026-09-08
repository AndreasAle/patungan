import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

import InputError from '@/components/input-error';
import { GoogleButton } from '@/components/patungan/google-button';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AuthLayout from '@/layouts/auth-layout';

interface LoginForm {
    [key: string]: string | boolean;
    email: string;
    password: string;
    remember: boolean;
}

interface LoginProps {
    status?: string;
    canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: LoginProps) {
    const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
        email: '',
        password: '',
        remember: false,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <AuthLayout title="Masuk ke akun kamu" description="Masukkan email dan password kamu">
            <Head title="Masuk" />

            {status && <div className="bg-success-soft text-success mb-4 rounded-xl px-3 py-2.5 text-center text-xs font-semibold">{status}</div>}

            <GoogleButton label="Masuk dengan Google" />

            <form className="flex flex-col gap-4" onSubmit={submit}>
                <div className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            required
                            autoFocus
                            tabIndex={1}
                            autoComplete="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="email@kamu.com"
                            className="h-12 rounded-xl"
                        />
                        <InputError message={errors.email} />
                    </div>

                    <div className="grid gap-1.5">
                        <div className="flex items-center">
                            <Label htmlFor="password">Password</Label>
                            {canResetPassword && (
                                <TextLink href={route('password.request')} className="text-primary ml-auto text-[11px] font-semibold" tabIndex={5}>
                                    Lupa password?
                                </TextLink>
                            )}
                        </div>
                        <Input
                            id="password"
                            type="password"
                            required
                            tabIndex={2}
                            autoComplete="current-password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="Password"
                            className="h-12 rounded-xl"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="flex items-center gap-2.5">
                        <Checkbox id="remember" name="remember" tabIndex={3} />
                        <Label htmlFor="remember" className="text-xs">
                            Ingat saya
                        </Label>
                    </div>

                    <Button type="submit" className="h-12 w-full rounded-full text-sm font-semibold" tabIndex={4} disabled={processing}>
                        {processing && <LoaderCircle className="size-4 animate-spin" />}
                        Masuk
                    </Button>
                </div>

                <div className="text-muted-foreground text-center text-xs">
                    Belum punya akun?{' '}
                    <TextLink href={route('register')} className="text-primary font-semibold" tabIndex={5}>
                        Daftar
                    </TextLink>
                </div>
            </form>
        </AuthLayout>
    );
}
