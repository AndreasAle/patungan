import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import { CountUp } from '@/components/landing/count-up';
import { Rail } from '@/components/landing/rail';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { HelpBubble } from '@/components/patungan/help-bubble';
import { Eyebrow } from '@/components/patungan/section-heading';
import { Button } from '@/components/ui/button';
import { rupiah, rupiahShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, ArrowUpRight, BellRing, Check, ChevronDown, DoorClosed, Lock, QrCode, ReceiptText, Wallet, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

interface WelcomeProps {
    /** Computed server-side by the same calculator that prices real invoices. */
    fee_examples: {
        amount: number;
        service_fee: number;
        charged_amount: number;
        gateway_fee: number;
        platform_fee: number;
        fee: number;
        net_amount: number;
    }[];
    invoice_minutes: number;
    max_participants: number;
}

const navLinks = [
    { label: 'Cara kerja', href: '#cara-kerja' },
    { label: 'Fitur', href: '#fitur' },
    { label: 'Biaya', href: '#biaya' },
    { label: 'FAQ', href: '#faq' },
];

/** QRIS is one standard, so every one of these apps can scan the same code. */
const payMethods = ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja', 'BCA mobile', 'Livin', 'BRImo', 'Jenius', 'blu'];

const steps = [
    { title: 'Bikin patungan', body: 'Tulis judulnya, tempel daftar nama langsung dari grup, tentukan nominalnya.' },
    { title: 'Share satu link', body: 'Satu link untuk satu grup. Lempar ke WhatsApp, selesai urusan kamu.' },
    { title: 'Teman bayar QRIS', body: 'Mereka cari namanya sendiri lalu scan. Tanpa daftar, tanpa login, tanpa aplikasi.' },
    { title: 'Kamu tinggal pantau', body: 'Status berubah sendiri begitu uangnya masuk. Nggak ada acara nagih.' },
];

const features: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: QrCode, title: 'Bayar pakai QRIS', body: 'Satu kode, semua e-wallet dan m-banking bisa. Nggak ada transfer manual.' },
    { icon: BellRing, title: 'Otomatis tercatat', body: 'Begitu pembayaran masuk, status peserta berubah sendiri. Nggak perlu cek mutasi.' },
    { icon: ReceiptText, title: 'Invoice tiap orang', body: 'Yang sudah lunas dapat bukti bayar sendiri, lengkap dengan QR untuk dicek.' },
    { icon: DoorClosed, title: 'Private room', body: 'Tiap peserta punya PIN sendiri dan cuma lihat tagihannya. Cocok buat vendor.' },
    { icon: Lock, title: 'Nominal dikunci server', body: 'Yang bayar nggak bisa mengubah angkanya. Nominal selalu dibaca dari database.' },
    { icon: Wallet, title: 'Saldo bisa dicairkan', body: 'Dana masuk tercatat rapi, lalu ditarik ke rekening atau e-wallet kamu.' },
];

const advantages = [
    { title: 'Tempel daftar dari chat', body: 'Copy line-up dari grup, nomor urut dan judul tim otomatis dibuang.' },
    { title: 'Batas waktu pembayaran', body: 'Tentukan sampai kapan link menerima pembayaran. Lewat itu, tertutup sendiri.' },
    { title: 'Nominal beda-beda', body: 'Sama rata atau beda tiap orang. Dua-duanya didukung sejak awal.' },
    { title: 'Riwayat yang rapi', body: 'Tiap rupiah yang masuk punya catatannya sendiri, bisa ditelusuri kapan saja.' },
];

const useCases = [
    { category: 'OLAHRAGA', title: 'Sewa lapangan', body: 'Badminton, futsal, mini soccer. Bagi rata, semua bayar sendiri-sendiri.' },
    { category: 'ACARA', title: 'Vendor acara', body: 'EO bayar lighting, sound, catering. Tiap vendor cuma lihat tagihannya.' },
    { category: 'VILLA', title: 'Sewa villa & trip', body: 'DP villa, bensin, tiket. Kumpulin dari jauh hari tanpa drama nagih.' },
    { category: 'KADO', title: 'Kado patungan', body: 'Nominal bebas per orang, progresnya kelihatan sampai target tercapai.' },
    { category: 'MAKAN', title: 'Makan bareng', body: 'Satu orang talangin dulu, sisanya bayar lewat link. Beres malam itu juga.' },
    { category: 'KAS', title: 'Kas bulanan', body: 'Iuran rutin komunitas atau angkatan, siapa belum bayar langsung kelihatan.' },
];

/*
 * Card tints for the two rails. Drawn from the existing tokens rather than new
 * colours, so the rails stay on brand and follow the theme into dark mode.
 */
const tones = [
    { card: 'bg-brand-soft/70 border-primary/15', mark: 'bg-primary text-primary-foreground' },
    { card: 'bg-lime/15 border-lime/40', mark: 'bg-lime text-lime-foreground' },
    { card: 'bg-warning-soft/70 border-warning/20', mark: 'bg-warning text-warning-foreground' },
    { card: 'bg-success-soft/70 border-success/20', mark: 'bg-success text-success-foreground' },
] as const;

const toneAt = (index: number) => tones[index % tones.length];

const faqs = [
    {
        q: 'Teman saya harus daftar akun dulu?',
        a: 'Tidak. Mereka cukup buka link, cari namanya, lalu bayar QRIS. Tidak ada daftar, login, verifikasi email, atau isi profil. Yang perlu punya akun cuma kamu sebagai pembuat patungan.',
    },
    {
        q: 'Bagaimana kalau ada yang salah pilih nama?',
        a: 'Sebelum bayar ada konfirmasi nama, dan satu peserta hanya bisa punya satu tagihan aktif. Kalau QRIS-nya keburu kedaluwarsa tanpa dibayar, tagihannya otomatis dibuka lagi supaya bisa diulang.',
    },
    {
        q: 'Uangnya masuk ke mana?',
        a: 'Setiap pembayaran yang berhasil tercatat sebagai saldo kamu, lengkap dengan rincian biayanya. Saldo itu bisa kamu cairkan ke rekening bank atau e-wallet yang kamu daftarkan.',
    },
    {
        q: 'Peserta bisa lihat nominal peserta lain?',
        a: 'Di link terbuka, ya, semua nama dan progresnya kelihatan. Kalau tidak mau, pakai mode Private room: tiap orang dapat PIN sendiri dan hanya melihat tagihannya, tanpa tahu total maupun daftar peserta lain.',
    },
    {
        q: 'Kalau uangnya belum masuk tapi statusnya sudah lunas?',
        a: 'Tidak bisa terjadi. Status hanya berubah setelah penyedia pembayaran mengirim notifikasi yang tanda tangannya diverifikasi dan nominalnya dicocokkan dengan tagihan. Halaman pembayaran tidak pernah menentukan status sendiri.',
    },
    {
        q: 'Saya bisa menandai orang yang bayar tunai?',
        a: 'Bisa. Tandai lunas secara manual, dan tercatat siapa yang menandainya. Orang itu tetap dapat invoice, tapi ditandai sebagai pembayaran manual, bukan lewat QRIS.',
    },
];

function Shell({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
    return (
        <section id={id} className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>
            {children}
        </section>
    );
}

export default function Welcome({ fee_examples, max_participants }: WelcomeProps) {
    const user = usePage<SharedData>().props.auth.user;
    const startHref = user ? route('patungan.create') : route('register');

    // Every figure below comes from the server; picking an amount only chooses
    // which precomputed breakdown to show, so the browser never does the maths.
    const [exampleIndex, setExampleIndex] = useState(0);
    const example = fee_examples[exampleIndex] ?? fee_examples[0];
    const payerCarries = example.service_fee > 0;

    return (
        <>
            <Head title="Patungan jadi gampang" />

            {/*
                overflow-x-clip, not -hidden: `hidden` turns this into a scroll
                container, which silently breaks `position: sticky` on the header
                below - it would stick to this box instead of the viewport and so
                never appear to stick at all. `clip` trims the decorative bleed
                without creating a scroll container.
            */}
            <div className="bg-background min-h-screen overflow-x-clip">
                <header className="border-border/70 bg-background/95 sticky top-0 z-50 border-b backdrop-blur-sm">
                    <Shell className="flex h-16 items-center justify-between lg:h-[72px]">
                        <AppLogo />

                        <nav className="hidden items-center gap-7 lg:flex">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="text-muted-foreground hover:text-foreground text-sm font-medium transition"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>

                        <div className="flex items-center gap-4">
                            {user ? (
                                <Button asChild className="h-10 rounded-full px-5 text-sm font-semibold">
                                    <Link href={route('dashboard')}>Dashboard</Link>
                                </Button>
                            ) : (
                                <>
                                    <Link href={route('login')} className="text-foreground hidden text-sm font-semibold sm:block">
                                        Masuk
                                    </Link>
                                    <Button asChild className="h-10 rounded-full px-5 text-sm font-semibold">
                                        <Link href={route('register')}>Coba gratis</Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </Shell>
                </header>

                {/* Hero: cut-out photography over a brand field, copy on the left */}
                <div className="relative overflow-hidden">
                    <div className="from-brand-soft/70 absolute inset-0 -z-10 bg-gradient-to-b via-transparent to-transparent" />
                    <div className="bg-lime/20 absolute -top-24 -right-24 -z-10 size-96 rounded-full blur-2xl" />

                    <Shell className="pt-12 lg:pt-16">
                        <div className="grid items-end gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
                            <div className="pb-4 lg:pb-20">
                                <Eyebrow>Patungan tanpa nagih</Eyebrow>

                                <h1 className="display text-foreground mt-5 text-[40px] sm:text-6xl lg:text-[68px]">
                                    Kumpulin uang
                                    <br />
                                    dari grup, <span className="text-primary">tanpa</span>
                                    <br />
                                    <span className="text-primary">drama nagih.</span>
                                </h1>

                                <p className="text-muted-foreground mt-6 max-w-md text-sm leading-relaxed sm:text-base">
                                    Bikin satu link, share ke grup, semua bayar bagiannya lewat QRIS. Kamu tinggal lihat siapa yang sudah bayar.
                                </p>

                                <div className="mt-8 flex flex-wrap items-center gap-5">
                                    <Button asChild className="h-12 rounded-full px-7 text-sm font-semibold">
                                        <Link href={startHref}>
                                            Buat patungan
                                            <ArrowRight className="size-4" />
                                        </Link>
                                    </Button>
                                    <a href="#cara-kerja" className="text-foreground group inline-flex items-center gap-1.5 text-sm font-semibold">
                                        Lihat cara kerja
                                        <ArrowUpRight className="size-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                                    </a>
                                </div>

                                <div className="border-border mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t pt-6">
                                    {[
                                        ['Gratis', 'bikin patungan'],
                                        ['Tanpa login', 'buat yang bayar'],
                                        [`${max_participants} orang`, 'per patungan'],
                                    ].map(([value, label]) => (
                                        <div key={label}>
                                            <p className="text-foreground text-base font-bold tracking-tight">{value}</p>
                                            <p className="text-muted-foreground text-[11px]">{label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* The cut-out runs to the bottom edge, so it reads as part of the page. */}
                            <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
                                <img
                                    src="/images/brand/hero-cutout.webp"
                                    alt="Pengguna Patungan menunjukkan daftar patungan aktif di aplikasi"
                                    width={1000}
                                    height={858}
                                    fetchPriority="high"
                                    className="relative z-10 w-full select-none"
                                />

                                <div className="border-border bg-card absolute top-1/4 -left-2 z-20 hidden rounded-2xl border p-3 shadow-xl sm:block">
                                    <div className="flex items-center gap-2.5">
                                        <span className="bg-success text-success-foreground flex size-7 shrink-0 items-center justify-center rounded-lg">
                                            <Check className="size-3.5" strokeWidth={3} />
                                        </span>
                                        <div>
                                            <p className="text-[11px] font-bold">Obet sudah bayar</p>
                                            <p className="text-muted-foreground text-[10px]">Rp25.000 · baru saja</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-border bg-card absolute right-0 bottom-16 z-20 hidden rounded-2xl border px-3.5 py-2.5 shadow-xl md:block">
                                    <p className="text-muted-foreground text-[10px]">Masuk ke saldo</p>
                                    <p className="text-primary text-sm font-bold tabular-nums">Rp24.575</p>
                                </div>
                            </div>
                        </div>
                    </Shell>
                </div>
                {/* Payment rail */}
                <div className="border-border bg-surface border-y py-7">
                    <Shell>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-10">
                            <p className="text-muted-foreground shrink-0 text-[11px] font-bold tracking-[0.18em] uppercase">Satu kode QRIS</p>
                            <div className="rail sm:gap-9">
                                {payMethods.map((method) => (
                                    <span key={method} className="text-foreground/40 text-base font-bold tracking-tight whitespace-nowrap">
                                        {method}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Shell>
                </div>

                {/* How it works */}
                <div className="surface-deep py-16 lg:py-24" id="cara-kerja">
                    <Shell>
                        <div className="grid gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
                            <div>
                                <Eyebrow onDeep>Cara kerja</Eyebrow>
                                <h2 className="display text-brand-deep-foreground mt-5 text-[32px] sm:text-5xl">
                                    Empat langkah, beres malam itu juga.
                                </h2>
                                <p className="text-brand-deep-muted mt-5 max-w-sm text-sm leading-relaxed">
                                    Nggak ada aplikasi yang harus diunduh teman kamu, nggak ada nomor rekening yang harus disalin, nggak ada
                                    screenshot bukti transfer yang harus dicek satu per satu.
                                </p>

                                <Button
                                    asChild
                                    className="bg-lime text-lime-foreground hover:bg-lime/90 mt-8 h-11 rounded-full px-6 text-sm font-semibold"
                                >
                                    <Link href={startHref}>Mulai sekarang</Link>
                                </Button>
                            </div>

                            <ol className="divide-brand-deep-muted/20 divide-y">
                                {steps.map((step, index) => (
                                    <li key={step.title} className="flex gap-5 py-6 first:pt-0 last:pb-0 sm:gap-8">
                                        <span className="text-lime/25 w-10 shrink-0 text-3xl font-extrabold tabular-nums sm:w-16 sm:text-5xl">
                                            {String(index + 1).padStart(2, '0')}
                                        </span>
                                        <div className="min-w-0 pt-1">
                                            <h3 className="text-brand-deep-foreground text-base font-bold tracking-tight sm:text-lg">{step.title}</h3>
                                            <p className="text-brand-deep-muted mt-1.5 text-sm leading-relaxed">{step.body}</p>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        </div>
                    </Shell>
                </div>

                {/* Campaign banner - the brand shot carries its own message, so nothing is laid over it. */}
                <div className="bg-surface">
                    <img
                        src="/images/brand/badminton-wide.webp"
                        alt="Patungan dipakai untuk membayar sewa lapangan badminton bersama"
                        width={1600}
                        height={900}
                        loading="lazy"
                        className="h-[42vw] max-h-[520px] min-h-[220px] w-full object-cover"
                    />
                </div>

                {/* Features rail */}
                <Shell id="fitur" className="py-16 lg:py-24">
                    <Rail
                        header={
                            <>
                                <Eyebrow>Fitur</Eyebrow>
                                <h2 className="display mt-5 max-w-lg text-[32px] sm:text-5xl">Semua yang bikin nagih jadi nggak perlu.</h2>
                            </>
                        }
                    >
                        {features.map((feature) => (
                            <article
                                key={feature.title}
                                className="border-border bg-card hover:border-primary/30 w-[74vw] rounded-3xl border p-6 transition sm:w-[19rem]"
                            >
                                <span className="bg-brand-soft text-primary flex size-11 items-center justify-center rounded-2xl">
                                    <feature.icon className="size-5" strokeWidth={2.2} />
                                </span>
                                <h3 className="mt-6 text-lg font-bold tracking-tight">{feature.title}</h3>
                                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{feature.body}</p>
                            </article>
                        ))}
                    </Rail>
                </Shell>

                {/* Dashboard */}
                <div className="border-border bg-surface border-y py-16 lg:py-24">
                    <Shell>
                        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
                            <div>
                                <Eyebrow>Dashboard</Eyebrow>
                                <h2 className="display mt-5 text-[32px] sm:text-5xl">Satu layar buat semua patungan kamu.</h2>
                                <p className="text-muted-foreground mt-5 max-w-md text-sm leading-relaxed">
                                    Siapa yang sudah bayar, berapa yang terkumpul, dan berapa saldo yang bisa dicairkan. Semuanya kelihatan tanpa
                                    perlu buka mutasi rekening.
                                </p>

                                <ul className="mt-7 space-y-3">
                                    {['Progres tiap patungan', 'Saldo tersedia & pending', 'Riwayat tiap rupiah yang masuk'].map((item) => (
                                        <li key={item} className="flex items-center gap-2.5">
                                            <span className="bg-lime text-lime-foreground flex size-5 shrink-0 items-center justify-center rounded-full">
                                                <Check className="size-3" strokeWidth={3.5} />
                                            </span>
                                            <span className="text-sm font-medium">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="relative">
                                <img
                                    src="/images/brand/desk-wide.webp"
                                    alt="Penyelenggara memantau patungannya dari dashboard Patungan"
                                    width={1500}
                                    height={844}
                                    loading="lazy"
                                    className="border-border w-full rounded-3xl border object-cover shadow-2xl"
                                />
                            </div>
                        </div>
                    </Shell>
                </div>

                {/* Advantages rail */}
                <Shell className="py-16 lg:py-24">
                    <Rail
                        header={
                            <>
                                <Eyebrow>Detail</Eyebrow>
                                <h2 className="display mt-5 max-w-lg text-[32px] sm:text-5xl">Hal kecil yang bikin bedanya kerasa.</h2>
                            </>
                        }
                    >
                        {advantages.map((advantage, index) => {
                            const tone = toneAt(index);

                            return (
                                <article
                                    key={advantage.title}
                                    className={cn('w-[74vw] rounded-3xl border p-6 transition hover:-translate-y-0.5 sm:w-[21rem]', tone.card)}
                                >
                                    <span
                                        className={cn('flex size-9 items-center justify-center rounded-xl text-xs font-bold tabular-nums', tone.mark)}
                                    >
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h3 className="mt-5 text-lg font-bold tracking-tight">{advantage.title}</h3>
                                    <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{advantage.body}</p>
                                </article>
                            );
                        })}
                    </Rail>
                </Shell>

                {/* Use cases rail */}
                <div className="border-border bg-surface border-y py-16 lg:py-24">
                    <Shell>
                        <Rail
                            header={
                                <>
                                    <Eyebrow>Dipakai buat apa</Eyebrow>
                                    <h2 className="display mt-5 max-w-lg text-[32px] sm:text-5xl">Kalau ada yang harus dibagi, Patungan bisa.</h2>
                                </>
                            }
                        >
                            {useCases.map((useCase, index) => {
                                const tone = toneAt(index);

                                return (
                                    <article
                                        key={useCase.title}
                                        className={cn('w-[74vw] rounded-3xl border p-6 transition hover:-translate-y-0.5 sm:w-[19rem]', tone.card)}
                                    >
                                        <CategoryIcon category={useCase.category} size="lg" className={tone.mark} />
                                        <h3 className="mt-5 text-lg font-bold tracking-tight">{useCase.title}</h3>
                                        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{useCase.body}</p>
                                    </article>
                                );
                            })}
                        </Rail>
                    </Shell>
                </div>

                {/* Photo grid - real moments, not another row of cards */}
                <Shell className="py-16 lg:py-24">
                    <Eyebrow>Di kehidupan nyata</Eyebrow>
                    <h2 className="display mt-5 max-w-lg text-[32px] sm:text-5xl">Dipakai di tempat uang biasanya jadi urusan.</h2>

                    <div className="mt-10 grid gap-3 sm:grid-cols-3">
                        {[
                            { src: 'badminton-app', alt: 'Membayar patungan sewa lapangan lewat ponsel', caption: 'Lapangan badminton' },
                            { src: 'cafe-split', alt: 'Dua orang membagi tagihan makan dengan QRIS', caption: 'Makan bareng' },
                            { src: 'friends-cafe', alt: 'Sekelompok teman membuka Patungan bersama', caption: 'Patungan komunitas' },
                        ].map((photo) => (
                            <figure key={photo.src} className="relative overflow-hidden rounded-3xl">
                                <img
                                    src={`/images/brand/${photo.src}.webp`}
                                    alt={photo.alt}
                                    width={900}
                                    height={1125}
                                    loading="lazy"
                                    className="aspect-[4/5] w-full object-cover"
                                />
                                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[hsl(159_68%_10%_/_0.85)] to-transparent px-5 pt-10 pb-4 text-sm font-bold text-white">
                                    {photo.caption}
                                </figcaption>
                            </figure>
                        ))}
                    </div>
                </Shell>

                {/* Fees */}
                <Shell id="biaya" className="py-16 lg:py-24">
                    <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-16">
                        <div>
                            <Eyebrow>Biaya</Eyebrow>
                            <h2 className="display mt-5 text-[32px] sm:text-5xl">Terbuka, tanpa biaya tersembunyi.</h2>
                            <p className="text-muted-foreground mt-5 max-w-sm text-sm leading-relaxed">
                                Bikin patungan dan share link selalu gratis. Biaya baru muncul saat ada pembayaran yang benar-benar masuk.
                            </p>
                        </div>

                        <div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="border-border bg-card rounded-3xl border p-5">
                                    <p className="text-muted-foreground text-[11px] font-semibold">Bikin patungan</p>
                                    <p className="display text-primary mt-2 text-2xl">Rp0</p>
                                    <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">Berapa pun pesertanya</p>
                                </div>

                                <div className="border-primary/40 bg-brand-soft rounded-3xl border p-5">
                                    <p className="text-muted-foreground text-[11px] font-semibold">Biaya layanan</p>
                                    <CountUp value={example.fee} className="display text-primary mt-2 block text-2xl tabular-nums" />
                                    <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
                                        Sudah termasuk biaya pembayaran. Hanya saat ada yang benar-benar bayar.
                                    </p>
                                </div>

                                <div className="border-lime/50 bg-lime/15 rounded-3xl border p-5">
                                    <p className="text-muted-foreground text-[11px] font-semibold">
                                        {payerCarries ? 'Kamu terima' : 'Masuk ke saldo'}
                                    </p>
                                    <p className="display text-primary mt-2 text-2xl">{payerCarries ? 'Penuh' : rupiah(example.net_amount)}</p>
                                    <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">
                                        {payerCarries ? 'Tagihanmu utuh, tanpa potongan' : 'Setelah biaya layanan'}
                                    </p>
                                </div>
                            </div>

                            <div className="border-border bg-card mt-3 rounded-3xl border p-6">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <p className="text-sm font-bold tracking-tight">Contohnya begini</p>

                                    {/* Switches between breakdowns the server already computed. */}
                                    <div className="bg-muted flex gap-1 rounded-full p-1">
                                        {fee_examples.map((option, index) => (
                                            <button
                                                key={option.amount}
                                                type="button"
                                                onClick={() => setExampleIndex(index)}
                                                aria-pressed={index === exampleIndex}
                                                className={cn(
                                                    'rounded-full px-3 py-1.5 text-[11px] font-semibold tabular-nums transition',
                                                    index === exampleIndex
                                                        ? 'bg-card text-foreground shadow-sm'
                                                        : 'text-muted-foreground hover:text-foreground',
                                                )}
                                            >
                                                {rupiahShort(option.amount)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <dl className="mt-5 space-y-3 text-sm">
                                    <div className="flex items-baseline justify-between gap-4">
                                        <dt className="text-muted-foreground">Tagihan per orang</dt>
                                        <CountUp value={example.amount} className="font-semibold tabular-nums" />
                                    </div>

                                    <div className="flex items-baseline justify-between gap-4">
                                        <dt className="text-muted-foreground">Biaya layanan</dt>
                                        <dd className="text-warning font-semibold tabular-nums">
                                            {payerCarries ? '+' : '−'}
                                            <CountUp value={example.fee} />
                                        </dd>
                                    </div>

                                    <div className="border-border flex items-baseline justify-between gap-4 border-t pt-3">
                                        <dt className="font-semibold">Peserta membayar</dt>
                                        <CountUp value={example.charged_amount} className="display text-lg tabular-nums" />
                                    </div>

                                    <div className="bg-brand-soft -mx-2 flex items-baseline justify-between gap-4 rounded-2xl px-4 py-3">
                                        <dt className="text-primary font-bold">Masuk ke saldo kamu</dt>
                                        <CountUp value={example.net_amount} className="display text-primary text-xl tabular-nums" />
                                    </div>
                                </dl>

                                <p className="text-muted-foreground mt-4 text-[11px] leading-relaxed">
                                    {payerCarries
                                        ? 'Biaya ditambahkan ke tagihan peserta, jadi kamu menerima persis sebesar yang kamu tagihkan.'
                                        : 'Biaya ditanggung penyelenggara, jadi peserta membayar persis sebesar tagihannya.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </Shell>

                {/* FAQ */}
                <div className="border-border bg-surface border-y py-16 lg:py-24">
                    <Shell id="faq">
                        <div className="grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
                            <div>
                                <Eyebrow>FAQ</Eyebrow>
                                <h2 className="display mt-5 text-[32px] sm:text-5xl">Yang sering ditanya.</h2>
                                <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
                                    Masih ada yang mau ditanya?{' '}
                                    <a href="mailto:patungan@trackertask.com" className="text-primary font-semibold">
                                        patungan@trackertask.com
                                    </a>
                                </p>
                            </div>

                            <div className="divide-border border-border divide-y border-t">
                                {faqs.map((faq) => (
                                    <details key={faq.q} className="group py-5 [&_summary::-webkit-details-marker]:hidden">
                                        <summary className="flex cursor-pointer list-none items-start justify-between gap-6">
                                            <span className="text-base font-bold tracking-tight">{faq.q}</span>
                                            <ChevronDown className="text-muted-foreground mt-1 size-4 shrink-0 transition group-open:rotate-180" />
                                        </summary>
                                        <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-relaxed">{faq.a}</p>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </Shell>
                </div>

                {/* Closing CTA over a brand photo */}
                <Shell className="py-16 lg:py-24">
                    <div className="relative overflow-hidden rounded-[2.5rem]">
                        <img
                            src="/images/brand/cafe-wide.webp"
                            alt=""
                            width={1500}
                            height={844}
                            loading="lazy"
                            className="absolute inset-0 size-full object-cover"
                        />
                        {/* Scrim keeps the headline readable over the photograph. */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[hsl(159_68%_10%_/_0.94)] via-[hsl(159_68%_10%_/_0.78)] to-[hsl(159_68%_10%_/_0.35)]" />

                        <div className="relative px-6 py-14 sm:px-14 sm:py-20">
                            <div className="max-w-lg">
                                <h2 className="display text-[34px] text-white sm:text-6xl">Bikin patungan pertama kamu.</h2>
                                <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/70">
                                    Gratis dibuat. Teman kamu cukup buka link dan bayar bagiannya lewat QRIS.
                                </p>

                                <Button
                                    asChild
                                    className="bg-lime text-lime-foreground hover:bg-lime/90 mt-8 h-12 rounded-full px-8 text-sm font-bold"
                                >
                                    <Link href={startHref}>
                                        Mulai sekarang
                                        <ArrowRight className="size-4" />
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </Shell>
                {/* Footer */}
                <footer className="border-border border-t pt-14">
                    <Shell>
                        <div className="grid gap-10 sm:grid-cols-4">
                            <div className="sm:col-span-2">
                                <AppLogo />
                                <p className="text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed">
                                    Kumpulin uang patungan lewat satu link. Bayar pakai QRIS, tanpa nagih satu-satu.
                                </p>
                            </div>

                            <div>
                                <p className="text-muted-foreground text-[11px] font-bold tracking-[0.18em] uppercase">Produk</p>
                                <ul className="mt-4 space-y-2.5">
                                    {navLinks.map((link) => (
                                        <li key={link.href}>
                                            <a href={link.href} className="text-muted-foreground hover:text-foreground text-sm">
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <p className="text-muted-foreground text-[11px] font-bold tracking-[0.18em] uppercase">Mulai</p>
                                <ul className="mt-4 space-y-2.5">
                                    <li>
                                        <Link href={route('register')} className="text-muted-foreground hover:text-foreground text-sm">
                                            Daftar
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={route('login')} className="text-muted-foreground hover:text-foreground text-sm">
                                            Masuk
                                        </Link>
                                    </li>
                                    <li>
                                        <a href="mailto:patungan@trackertask.com" className="text-muted-foreground hover:text-foreground text-sm">
                                            Kontak
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="border-border mt-12 flex items-center justify-between border-t py-6">
                            <p className="text-muted-foreground text-[11px]">© {new Date().getFullYear()} Patungan</p>
                            <AppLogoIcon className="size-6" />
                        </div>
                    </Shell>

                    {/* Oversized wordmark, cropped by the viewport edge */}
                    <p aria-hidden="true" className="display text-primary/15 -mb-[0.16em] px-4 text-center text-[clamp(4rem,19vw,15rem)] select-none">
                        Patungan
                    </p>
                </footer>
                <HelpBubble />
            </div>
        </>
    );
}
