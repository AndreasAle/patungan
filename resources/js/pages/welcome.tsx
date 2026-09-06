import AppLogo from '@/components/app-logo';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { Button } from '@/components/ui/button';
import type { SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, Check, Link2, QrCode, Users } from 'lucide-react';

const steps = [
    { icon: Users, title: 'Buat patungan', body: 'Tulis judul, masukkan nama teman-teman, tentukan nominalnya.' },
    { icon: Link2, title: 'Share link', body: 'Satu link untuk satu grup. Lempar ke WhatsApp, selesai.' },
    { icon: QrCode, title: 'Teman bayar QRIS', body: 'Mereka pilih namanya sendiri lalu scan. Tanpa daftar, tanpa login.' },
    { icon: Check, title: 'Kamu pantau semuanya', body: 'Status berubah otomatis begitu uangnya masuk.' },
];

const useCases = [
    { category: 'OLAHRAGA', label: 'Badminton' },
    { category: 'OLAHRAGA', label: 'Futsal' },
    { category: 'MAKAN', label: 'Makan bareng' },
    { category: 'VILLA', label: 'Sewa villa' },
    { category: 'KADO', label: 'Kado patungan' },
    { category: 'TRIP', label: 'Trip' },
    { category: 'ACARA', label: 'Acara' },
    { category: 'KAS', label: 'Kas bulanan' },
];

export default function Welcome() {
    const user = usePage<SharedData>().props.auth.user;

    return (
        <>
            <Head title="Patungan jadi gampang" />

            <div className="bg-background min-h-screen">
                <header className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 lg:px-8">
                    <AppLogo />

                    <nav className="flex items-center gap-2">
                        {user ? (
                            <Button asChild className="rounded-xl font-semibold">
                                <Link href={route('dashboard')}>Dashboard</Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost" className="font-medium">
                                    <Link href={route('login')}>Masuk</Link>
                                </Button>
                                <Button asChild className="rounded-xl font-semibold">
                                    <Link href={route('register')}>Daftar</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </header>

                <section className="mx-auto w-full max-w-5xl px-4 pt-10 pb-16 lg:px-8 lg:pt-20">
                    <h1 className="text-foreground max-w-2xl text-4xl leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                        Patungan jadi gampang.
                    </h1>

                    <p className="text-muted-foreground mt-5 max-w-xl text-lg">
                        Bikin link, share ke grup, semua bayar pakai QRIS. Nggak perlu transfer satu-satu, nggak perlu cek siapa yang sudah bayar.
                    </p>

                    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <Button asChild size="lg" className="h-12 rounded-xl px-6 text-base font-semibold">
                            <Link href={user ? route('patungan.create') : route('register')}>
                                Buat Patungan
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                        <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6 text-base font-semibold">
                            <a href="#cara-kerja">Lihat cara kerja</a>
                        </Button>
                    </div>

                    <dl className="mt-12 grid max-w-lg grid-cols-3 gap-4">
                        <div>
                            <dt className="text-muted-foreground text-sm">Buat patungan</dt>
                            <dd className="text-xl font-bold tracking-tight">1 menit</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-sm">Bayar</dt>
                            <dd className="text-xl font-bold tracking-tight">Scan QRIS</dd>
                        </div>
                        <div>
                            <dt className="text-muted-foreground text-sm">Untuk yang bayar</dt>
                            <dd className="text-xl font-bold tracking-tight">Tanpa login</dd>
                        </div>
                    </dl>
                </section>

                <section id="cara-kerja" className="border-border bg-card border-y">
                    <div className="mx-auto w-full max-w-5xl px-4 py-16 lg:px-8">
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Cara kerjanya</h2>

                        <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {steps.map((step, index) => (
                                <li key={step.title}>
                                    <span className="bg-brand-soft text-primary flex size-11 items-center justify-center rounded-2xl">
                                        <step.icon className="size-5" strokeWidth={2.2} />
                                    </span>
                                    <p className="text-muted-foreground mt-4 text-sm font-semibold">Langkah {index + 1}</p>
                                    <h3 className="mt-0.5 font-bold tracking-tight">{step.title}</h3>
                                    <p className="text-muted-foreground mt-1.5 text-sm">{step.body}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-5xl px-4 py-16 lg:px-8">
                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Dipakai buat apa aja</h2>

                    <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {useCases.map((useCase) => (
                            <li key={useCase.label} className="border-border bg-card flex items-center gap-3 rounded-2xl border p-3">
                                <CategoryIcon category={useCase.category} size="sm" />
                                <span className="text-sm font-semibold">{useCase.label}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="bg-primary text-primary-foreground mt-14 rounded-3xl px-6 py-12 text-center">
                        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Bikin patungan pertama kamu</h2>
                        <p className="text-primary-foreground/80 mx-auto mt-2 max-w-md">
                            Gratis dibuat. Teman kamu cukup buka link dan bayar bagiannya.
                        </p>
                        <Button asChild size="lg" variant="secondary" className="mt-6 h-12 rounded-xl px-6 text-base font-semibold">
                            <Link href={user ? route('patungan.create') : route('register')}>Mulai sekarang</Link>
                        </Button>
                    </div>
                </section>

                <footer className="border-border text-muted-foreground border-t py-8 text-center text-sm">
                    Patungan · Kumpulin uang bareng tanpa drama.
                </footer>
            </div>
        </>
    );
}
