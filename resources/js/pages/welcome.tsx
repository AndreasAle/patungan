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
    { category: 'MAKAN', label: 'Makan bareng' },
    { category: 'VILLA', label: 'Sewa villa' },
    { category: 'KADO', label: 'Kado patungan' },
    { category: 'TRIP', label: 'Trip' },
    { category: 'NONGKRONG', label: 'Nongkrong' },
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

                    <nav className="flex items-center gap-1.5">
                        {user ? (
                            <Button asChild className="h-10 rounded-xl text-sm font-semibold">
                                <Link href={route('dashboard')}>Dashboard</Link>
                            </Button>
                        ) : (
                            <>
                                <Button asChild variant="ghost" className="h-10 text-sm font-medium">
                                    <Link href={route('login')}>Masuk</Link>
                                </Button>
                                <Button asChild className="h-10 rounded-xl text-sm font-semibold">
                                    <Link href={route('register')}>Daftar</Link>
                                </Button>
                            </>
                        )}
                    </nav>
                </header>

                <section className="mx-auto w-full max-w-5xl px-4 pt-6 pb-10 lg:px-8 lg:pt-16 lg:pb-16">
                    <div className="surface-deep rounded-[28px] px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
                        <h1 className="text-brand-deep-foreground max-w-2xl text-[28px] leading-[1.15] font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                            Patungan jadi gampang.
                        </h1>

                        <p className="text-brand-deep-muted mt-3 max-w-md text-sm leading-relaxed sm:mt-4 sm:text-base">
                            Bikin link, share ke grup, semua bayar pakai QRIS. Nggak perlu transfer satu-satu, nggak perlu cek siapa yang sudah bayar.
                        </p>

                        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                            <Button
                                asChild
                                className="bg-lime text-lime-foreground hover:bg-lime/90 h-11 rounded-xl px-6 text-sm font-semibold sm:w-auto"
                            >
                                <Link href={user ? route('patungan.create') : route('register')}>
                                    Buat Patungan
                                    <ArrowRight className="size-4" />
                                </Link>
                            </Button>
                            <Button
                                asChild
                                variant="ghost"
                                className="text-brand-deep-foreground h-11 rounded-xl bg-white/10 px-6 text-sm font-semibold hover:bg-white/15 hover:text-white"
                            >
                                <a href="#cara-kerja">Lihat cara kerja</a>
                            </Button>
                        </div>

                        <dl className="mt-8 grid max-w-lg grid-cols-3 gap-3 sm:mt-10">
                            {[
                                ['Buat patungan', '1 menit'],
                                ['Bayar', 'Scan QRIS'],
                                ['Yang bayar', 'Tanpa login'],
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <dt className="text-brand-deep-muted text-[11px]">{label}</dt>
                                    <dd className="text-brand-deep-foreground mt-0.5 text-sm font-bold tracking-tight sm:text-base">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                <section id="cara-kerja" className="border-border bg-surface border-y">
                    <div className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8 lg:py-16">
                        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Cara kerjanya</h2>

                        <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {steps.map((step, index) => (
                                <li key={step.title}>
                                    <span className="bg-brand-soft text-primary flex size-10 items-center justify-center rounded-xl">
                                        <step.icon className="size-[18px]" strokeWidth={2.2} />
                                    </span>
                                    <p className="text-muted-foreground mt-3 text-[11px] font-semibold">Langkah {index + 1}</p>
                                    <h3 className="mt-0.5 text-sm font-bold tracking-tight">{step.title}</h3>
                                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{step.body}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-5xl px-4 py-10 lg:px-8 lg:py-16">
                    <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Dipakai buat apa aja</h2>

                    <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                        {useCases.map((useCase) => (
                            <li key={useCase.label} className="border-border bg-card flex items-center gap-2.5 rounded-2xl border p-2.5">
                                <CategoryIcon category={useCase.category} size="sm" />
                                <span className="truncate text-xs font-semibold">{useCase.label}</span>
                            </li>
                        ))}
                    </ul>

                    <div className="surface-deep mt-10 rounded-3xl px-5 py-10 text-center">
                        <h2 className="text-brand-deep-foreground text-xl font-bold tracking-tight sm:text-2xl">Bikin patungan pertama kamu</h2>
                        <p className="text-brand-deep-muted mx-auto mt-2 max-w-sm text-xs leading-relaxed sm:text-sm">
                            Gratis dibuat. Teman kamu cukup buka link dan bayar bagiannya.
                        </p>
                        <Button asChild className="bg-lime text-lime-foreground hover:bg-lime/90 mt-5 h-11 rounded-xl px-6 text-sm font-semibold">
                            <Link href={user ? route('patungan.create') : route('register')}>Mulai sekarang</Link>
                        </Button>
                    </div>
                </section>

                <footer className="border-border text-muted-foreground border-t py-6 text-center text-xs">
                    Patungan · Kumpulin uang bareng tanpa drama.
                </footer>
            </div>
        </>
    );
}
