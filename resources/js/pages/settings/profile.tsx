import { type SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

import DeleteUser from '@/components/delete-user';
import HeadingSmall from '@/components/heading-small';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';

export default function Profile({ mustVerifyEmail, status }: { mustVerifyEmail: boolean; status?: string }) {
    const user = usePage<SharedData>().props.auth.user;

    const { data, setData, patch, errors, processing, recentlySuccessful } = useForm({
        name: user?.name ?? '',
        email: user?.email ?? '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();

        patch(route('profile.update'));
    };

    return (
        <AppLayout title="Profil">
            <Head title="Profil" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall title="Informasi profil" description="Ubah nama dan alamat email kamu" />

                    <form onSubmit={submit} className="space-y-6">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nama</Label>

                            <Input
                                id="name"
                                className="mt-1 block h-12 w-full rounded-xl"
                                value={data.name}
                                onChange={(event) => setData('name', event.target.value)}
                                required
                                autoComplete="name"
                                placeholder="Nama lengkap"
                            />

                            <InputError className="mt-2" message={errors.name} />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>

                            <Input
                                id="email"
                                type="email"
                                className="mt-1 block h-12 w-full rounded-xl"
                                value={data.email}
                                onChange={(event) => setData('email', event.target.value)}
                                required
                                autoComplete="username"
                                placeholder="email@kamu.com"
                            />

                            <InputError className="mt-2" message={errors.email} />
                        </div>

                        {mustVerifyEmail && user?.email_verified_at === null && (
                            <div>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Email kamu belum diverifikasi.{' '}
                                    <Link
                                        href={route('verification.send')}
                                        method="post"
                                        as="button"
                                        className="text-primary rounded-md text-sm font-semibold underline"
                                    >
                                        Kirim ulang email verifikasi.
                                    </Link>
                                </p>

                                {status === 'verification-link-sent' && (
                                    <div className="text-success mt-2 text-sm font-medium">Link verifikasi baru sudah dikirim ke email kamu.</div>
                                )}
                            </div>
                        )}

                        <div className="flex items-center gap-4">
                            <Button className="h-11 rounded-xl font-semibold" disabled={processing}>
                                Simpan
                            </Button>

                            <Transition
                                show={recentlySuccessful}
                                enter="transition ease-in-out"
                                enterFrom="opacity-0"
                                leave="transition ease-in-out"
                                leaveTo="opacity-0"
                            >
                                <p className="text-muted-foreground text-sm">Tersimpan</p>
                            </Transition>
                        </div>
                    </form>
                </div>

                <DeleteUser />
            </SettingsLayout>
        </AppLayout>
    );
}
