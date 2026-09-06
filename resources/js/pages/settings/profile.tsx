import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { InitialsAvatar } from '@/components/patungan/initials-avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SettingsLayout, { SettingsCard } from '@/layouts/settings/layout';
import type { SharedData } from '@/types';
import { Transition } from '@headlessui/react';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { MailWarning } from 'lucide-react';
import type { FormEventHandler } from 'react';

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
        <SettingsLayout title="Profil" description="Atur nama dan email yang dipakai di akun kamu.">
            <Head title="Profil" />

            <SettingsCard title="Informasi profil" description="Nama ini yang muncul sebagai penyelenggara di link patungan kamu.">
                <div className="bg-surface mb-4 flex items-center gap-3 rounded-xl px-3.5 py-3">
                    <InitialsAvatar name={data.name || (user?.name ?? '')} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{data.name || user?.name}</p>
                        <p className="text-muted-foreground truncate text-[11px]">{user?.is_admin ? 'Admin' : 'Organizer'}</p>
                    </div>
                </div>

                <form onSubmit={submit} className="space-y-3.5">
                    <div>
                        <Label htmlFor="name">Nama</Label>
                        <Input
                            id="name"
                            className="mt-1.5 h-11 rounded-xl"
                            value={data.name}
                            onChange={(event) => setData('name', event.target.value)}
                            required
                            autoComplete="name"
                            placeholder="Nama lengkap"
                        />
                        <InputError className="mt-1.5" message={errors.name} />
                    </div>

                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            className="mt-1.5 h-11 rounded-xl"
                            value={data.email}
                            onChange={(event) => setData('email', event.target.value)}
                            required
                            autoComplete="username"
                            placeholder="email@kamu.com"
                        />
                        <InputError className="mt-1.5" message={errors.email} />
                    </div>

                    {mustVerifyEmail && user?.email_verified_at === null && (
                        <div className="bg-warning-soft text-warning flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed">
                            <MailWarning className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                                Email kamu belum diverifikasi.{' '}
                                <Link href={route('verification.send')} method="post" as="button" className="font-semibold underline">
                                    Kirim ulang link verifikasi.
                                </Link>
                                {status === 'verification-link-sent' && (
                                    <span className="text-success mt-1 block font-semibold">Link verifikasi baru sudah dikirim.</span>
                                )}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center gap-3 pt-0.5">
                        <Button className="h-11 rounded-xl px-5 text-sm font-semibold" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan'}
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

            <DeleteUser />
        </SettingsLayout>
    );
}
