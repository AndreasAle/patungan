import InputError from '@/components/input-error';
import { PasswordInput } from '@/components/patungan/password-input';
import SettingsLayout, { SettingsCard } from '@/layouts/settings/layout';
import { Transition } from '@headlessui/react';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler, useRef } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function Password() {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);

    const { data, setData, errors, put, reset, processing, recentlySuccessful } = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const updatePassword: FormEventHandler = (e) => {
        e.preventDefault();

        put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => reset(),
            onError: (errors) => {
                if (errors.password) {
                    reset('password', 'password_confirmation');
                    passwordInput.current?.focus();
                }

                if (errors.current_password) {
                    reset('current_password');
                    currentPasswordInput.current?.focus();
                }
            },
        });
    };

    return (
        <SettingsLayout title="Password" description="Amankan akun kamu dengan password yang kuat.">
            <Head title="Password" />

            <SettingsCard title="Ganti password" description="Pakai password panjang dan acak, jangan yang dipakai di aplikasi lain.">
                <form onSubmit={updatePassword} className="space-y-3.5">
                    <div>
                        <Label htmlFor="current_password">Password sekarang</Label>

                        <PasswordInput
                            id="current_password"
                            ref={currentPasswordInput}
                            value={data.current_password}
                            onChange={(e) => setData('current_password', e.target.value)}
                            className="mt-1.5"
                            autoComplete="current-password"
                            placeholder="Password sekarang"
                        />

                        <InputError className="mt-1.5" message={errors.current_password} />
                    </div>

                    <div>
                        <Label htmlFor="password">Password baru</Label>

                        <PasswordInput
                            id="password"
                            ref={passwordInput}
                            showStrength
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            className="mt-1.5"
                            autoComplete="new-password"
                            placeholder="Password baru"
                        />

                        <InputError className="mt-1.5" message={errors.password} />
                    </div>

                    <div>
                        <Label htmlFor="password_confirmation">Ulangi password</Label>

                        <PasswordInput
                            id="password_confirmation"
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            className="mt-1.5"
                            autoComplete="new-password"
                            placeholder="Ulangi password"
                        />

                        <InputError className="mt-1.5" message={errors.password_confirmation} />
                    </div>

                    <div className="flex items-center gap-4">
                        <Button className="h-11 rounded-full px-6 text-sm font-semibold" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan password'}
                        </Button>

                        <Transition
                            show={recentlySuccessful}
                            enter="transition ease-in-out"
                            enterFrom="opacity-0"
                            leave="transition ease-in-out"
                            leaveTo="opacity-0"
                        >
                            <p className="text-success text-xs font-medium">Tersimpan</p>
                        </Transition>
                    </div>
                </form>
            </SettingsCard>
        </SettingsLayout>
    );
}
