import InputError from '@/components/input-error';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { DeadlinePicker } from '@/components/patungan/deadline-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PatunganLayout from '@/layouts/patungan-layout';
import { toLocalDateTimeInput } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PatunganDetail } from '@/types';
import { Head, useForm } from '@inertiajs/react';
import type { FormEvent } from 'react';

interface EditProps {
    patungan: PatunganDetail;
    categories: { value: string; label: string }[];
}

export default function PatunganEdit({ patungan, categories }: EditProps) {
    const { data, setData, patch, processing, errors } = useForm({
        title: patungan.title,
        description: patungan.description ?? '',
        category: patungan.category,
        event_date: patungan.event_date ?? '',
        expires_at: patungan.expires_at ? toLocalDateTimeInput(new Date(patungan.expires_at)) : '',
        name_privacy: patungan.name_privacy,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        patch(route('patungan.update', patungan.uuid));
    };

    return (
        <PatunganLayout title="Ubah patungan" back={route('patungan.show', patungan.uuid)}>
            <Head title={`Ubah ${patungan.title}`} />

            <form onSubmit={submit} className="mx-auto w-full max-w-xl space-y-5">
                <div>
                    <Label htmlFor="title">Judul patungan</Label>
                    <Input
                        id="title"
                        value={data.title}
                        onChange={(event) => setData('title', event.target.value)}
                        className="mt-1.5 h-12 rounded-xl"
                    />
                    <InputError message={errors.title} className="mt-1.5" />
                </div>

                <div>
                    <Label htmlFor="description">Deskripsi</Label>
                    <Input
                        id="description"
                        value={data.description}
                        onChange={(event) => setData('description', event.target.value)}
                        className="mt-1.5 h-12 rounded-xl"
                    />
                    <InputError message={errors.description} className="mt-1.5" />
                </div>

                <div>
                    <Label>Kategori</Label>
                    <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {categories.map((category) => (
                            <button
                                key={category.value}
                                type="button"
                                onClick={() => setData('category', category.value)}
                                className={cn(
                                    'flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition',
                                    data.category === category.value
                                        ? 'border-primary bg-brand-soft text-primary'
                                        : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                                )}
                            >
                                <CategoryIcon category={category.value} size="sm" className="bg-transparent" />
                                {category.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <Label htmlFor="event_date">Tanggal kegiatan</Label>
                    <Input
                        id="event_date"
                        type="date"
                        value={data.event_date}
                        onChange={(event) => setData('event_date', event.target.value)}
                        className="mt-1.5 h-12 rounded-xl"
                    />
                    <InputError message={errors.event_date} className="mt-1.5" />
                </div>

                <div>
                    <DeadlinePicker value={data.expires_at} onChange={(value) => setData('expires_at', value)} />
                    <InputError message={errors.expires_at} className="mt-1.5" />
                </div>

                <div>
                    <Label>Privasi nama di link publik</Label>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {(
                            [
                                { value: 'FULL', title: 'Nama lengkap', body: 'Andreas' },
                                { value: 'MASKED', title: 'Nama disamarkan', body: 'A*****s' },
                            ] as const
                        ).map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => setData('name_privacy', option.value)}
                                className={cn(
                                    'rounded-2xl border p-4 text-left transition',
                                    data.name_privacy === option.value
                                        ? 'border-primary bg-brand-soft'
                                        : 'border-border bg-card hover:border-primary/40',
                                )}
                            >
                                <p className="font-semibold">{option.title}</p>
                                <p className="text-muted-foreground mt-0.5 text-sm">{option.body}</p>
                            </button>
                        ))}
                    </div>
                </div>

                <Button type="submit" className="h-12 w-full rounded-xl font-semibold" disabled={processing}>
                    {processing ? 'Menyimpan...' : 'Simpan perubahan'}
                </Button>
            </form>
        </PatunganLayout>
    );
}
