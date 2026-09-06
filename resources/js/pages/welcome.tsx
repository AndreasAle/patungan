import AppLogo from '@/components/app-logo';
import AppLogoIcon from '@/components/app-logo-icon';
import { AppPreview } from '@/components/landing/app-preview';
import { PhoneMockup } from '@/components/landing/phone-mockup';
import { CategoryIcon } from '@/components/patungan/category-icon';
import { Button } from '@/components/ui/button';
import { rupiah } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BellRing,
    Check,
    ChevronDown,
    ClipboardPaste,
    DoorClosed,
    Link2,
    Lock,
    QrCode,
    ReceiptText,
    Sparkles,
    Wallet,
} from 'lucide-react';

interface WelcomeProps {
    fees: {
        platform_flat: number;
        platform_bps: number;
        gateway_flat: number;
        gateway_bps: number;
        bearer: string;
    };
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
const payMethods = ['GoPay', 'OVO', 'DANA', 'ShopeePay', 'LinkAja', 'BCA mobile', 'Livin', 'BRImo'];

const steps = [
    { icon: ClipboardPaste, title: 'Bikin patungan', body: 'Tulis judulnya, tempel daftar nama dari grup, tentukan nominalnya.' },
    { icon: Link2, title: 'Share satu link', body: 'Satu link untuk satu grup. Lempar ke WhatsApp, sudah.' },
    { icon: QrCode, title: 'Teman bayar QRIS', body: 'Mereka pilih namanya sendiri lalu scan. Tanpa daftar, tanpa login.' },
    { icon: Check, title: 'Kamu pantau semuanya', body: 'Status berubah sendiri begitu uangnya masuk. Nggak perlu nagih.' },
];

const features = [
    { icon: QrCode, title: 'Bayar pakai QRIS', body: 'Satu kode, semua e-wallet dan m-banking bisa. Nggak ada transfer manual.' },
    { icon: BellRing, title: 'Otomatis tercatat', body: 'Begitu pembayaran masuk, status peserta berubah sendiri. Nggak perlu cek mutasi.' },
    { icon: ReceiptText, title: 'Invoice tiap orang', body: 'Yang sudah lunas dapat bukti bayar sendiri, lengkap dengan QR untuk dicek.' },
    { icon: DoorClosed, title: 'Private room', body: 'Tiap peserta punya PIN sendiri dan cuma lihat tagihannya. Cocok buat vendor.' },
    { icon: Lock, title: 'Nominal dikunci server', body: 'Yang bayar nggak bisa mengubah angkanya. Nominal selalu dibaca dari database.' },
    { icon: Wallet, title: 'Saldo bisa dicairkan', body: 'Dana masuk tercatat di ledger, lalu bisa ditarik ke rekening atau e-wallet kamu.' },
];

const advantages = [
    { title: 'Tempel daftar dari chat', body: 'Copy line-up dari grup, nomor urut dan judul tim otomatis dibuang.' },
    { title: 'Batas waktu pembayaran', body: 'Tentukan sampai kapan link menerima pembayaran. Lewat itu, otomatis tertutup.' },
    { title: 'Nominal beda-beda', body: 'Sama rata atau beda tiap orang. Dua-duanya didukung sejak awal.' },
    { title: 'Riwayat yang rapi', body: 'Tiap rupiah yang masuk punya catatannya sendiri, bisa ditelusuri kapan saja.' },
];

const useCases = [
    { category: 'OLAHRAGA', title: 'Sewa lapangan', body: 'Badminton, futsal, mini soccer. Bagi rata, semua bayar sendiri-sendiri.' },
    { category: 'ACARA', title: 'Vendor acara', body: 'EO bayar lighting, sound, catering. Tiap vendor cuma lihat tagihannya.' },
    { category: 'VILLA', title: 'Sewa villa & trip', body: 'DP villa, bensin, tiket. Kumpulin dari jauh hari tanpa drama nagih.' },
    { category: 'KADO', title: 'Kado patungan', body: 'Nominal bebas per orang, progresnya kelihatan sampai target tercapai.' },
    { category: 'MAKAN', title: 'Makan bareng', body: 'Satu orang talangin dulu, sisanya bayar lewat link. Beres malam itu juga.' },
    { category: 'KAS', title: 'Kas bulanan', body: 'Iuran rutin komunitas atau angkatan, siapa yang belum bayar langsung kelihatan.' },
];

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

function Section({ id, className, children }: { id?: string; className?: string; children: React.ReactNode }) {
    return (
        <section id={id} className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>
            {children}
        </section>
    );
}

export default function Welcome({ fees, invoice_minutes, max_participants }: WelcomeProps) {
    const user = usePage<SharedData>().props.auth.user;
    const startHref = user ? route('patungan.create') : route('register');

    const platformFee =
        fees.platform_bps > 0 ? `${rupiah(fees.platform_flat)} + ${(fees.platform_bps / 100).toFixed(2)}%` : rupiah(fees.platform_flat);
    const gatewayFee = fees.gateway_bps > 0 ? `${(fees.gateway_bps / 100).toFixed(2)}%` : rupiah(fees.gateway_flat);

    return (
        <>
            <Head title="Patungan jadi gampang" />

            <div className="bg-background min-h-screen">
                {/* Announcement bar */}
                <div className="surface-deep flex h-9 items-center justify-center px-4">
                    <p className="text-brand-deep-foreground inline-flex items-center gap-1.5 text-[11px] font-medium">
                        <Sparkles className="text-lime size-3" />
                        Bayar patungan lewat QRIS, tanpa nagih satu-satu
                    </p>
                </div>

                {/* Nav */}
                <header className="border-border bg-background/90 sticky top-0 z-50 border-b backdrop-blur-xl">
                    <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
                        <AppLogo />

                        <nav className="hidden items-center gap-1 lg:flex">
                            {navLinks.map((link) => (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="text-muted-foreground hover:text-foreground hover:bg-surface rounded-full px-3.5 py-2 text-sm font-medium transition"
                                >
                                    {link.label}
                                </a>
                            ))}
                        </nav>

                        <div className="flex items-center gap-1.5">
                            {user ? (
                                <Button asChild className="h-10 rounded-full px-5 text-sm font-semibold">
                                    <Link href={route('dashboard')}>Dashboard</Link>
                                </Button>
                            ) : (
                                <>
                                    <Button asChild variant="ghost" className="hidden h-10 rounded-full text-sm font-medium sm:inline-flex">
                                        <Link href={route('login')}>Masuk</Link>
                                    </Button>
                                    <Button asChild className="h-10 rounded-full px-5 text-sm font-semibold">
                                        <Link href={route('register')}>Coba gratis</Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Hero */}
                <Section className="pt-12 pb-10 text-center sm:pt-16 lg:pt-20">
                    <span className="border-border bg-card text-muted-foreground inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold">
                        <span className="bg-lime size-1.5 rounded-full" />
                        Tanpa login untuk yang bayar
                    </span>

                    <h1 className="text-foreground mx-auto mt-5 max-w-3xl text-[32px] leading-[1.1] font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                        Cara paling gampang <span className="text-primary">kumpulin uang</span> dari grup
                    </h1>

                    <p className="text-muted-foreground mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
                        Bikin link patungan, share ke grup, semua bayar bagiannya lewat QRIS. Nggak perlu transfer satu-satu, nggak perlu cek siapa
                        yang sudah bayar.
                    </p>

                    <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
                        <Button asChild className="h-12 w-full rounded-full px-7 text-sm font-semibold sm:w-auto">
                            <Link href={startHref}>
                                Buat patungan
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="h-12 w-full rounded-full px-7 text-sm font-semibold sm:w-auto">
                            <a href="#cara-kerja">Lihat cara kerja</a>
                        </Button>
                    </div>

                    <p className="text-muted-foreground mt-3 text-[11px]">Gratis dibuat · Sampai {max_participants} peserta per patungan</p>

                    {/* Product shot on a soft brand field */}
                    <div className="relative mt-12">
                        <div className="from-brand-soft via-surface absolute inset-x-0 top-10 bottom-16 rounded-[2.5rem] bg-gradient-to-b to-transparent" />
                        <AppPreview className="relative mx-auto max-w-sm" />
                    </div>
                </Section>

                {/* Payment methods */}
                <Section className="pb-14">
                    <p className="text-muted-foreground text-center text-[11px] font-semibold tracking-wide uppercase">
                        Satu kode QRIS, dibayar dari aplikasi apa saja
                    </p>
                    <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                        {payMethods.map((method) => (
                            <li key={method} className="text-muted-foreground/80 text-sm font-bold tracking-tight">
                                {method}
                            </li>
                        ))}
                    </ul>
                </Section>

                {/* How it works */}
                <div className="border-border bg-surface border-y">
                    <Section id="cara-kerja" className="py-14 lg:py-20">
                        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                            <div>
                                <p className="text-primary text-[11px] font-bold tracking-wide uppercase">Cara kerja</p>
                                <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                                    Dari grup WhatsApp ke uang terkumpul, dalam empat langkah
                                </h2>
                                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                                    Tidak ada aplikasi yang harus diunduh teman kamu, tidak ada nomor rekening yang harus disalin, dan tidak ada
                                    screenshot bukti transfer yang harus dicek satu-satu.
                                </p>

                                <ol className="mt-7 space-y-5">
                                    {steps.map((step, index) => (
                                        <li key={step.title} className="flex gap-3.5">
                                            <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold tracking-tight">{step.title}</p>
                                                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{step.body}</p>
                                            </div>
                                        </li>
                                    ))}
                                </ol>

                                <Button asChild className="mt-8 h-11 rounded-full px-6 text-sm font-semibold">
                                    <Link href={startHref}>Mulai sekarang</Link>
                                </Button>
                            </div>

                            <div className="mx-auto w-full max-w-[260px]">
                                <PhoneMockup>
                                    <div className="surface-deep px-4 pt-8 pb-5 text-center">
                                        <p className="text-brand-deep-muted text-[10px]">Bayar</p>
                                        <p className="text-brand-deep-foreground mt-1 text-2xl leading-none font-bold tracking-tight">Rp25.000</p>
                                        <p className="text-brand-deep-muted mt-1.5 text-[10px]">untuk Nanda · Badminton Minggu</p>
                                    </div>

                                    <div className="p-4">
                                        <div className="border-border bg-card rounded-2xl border p-4">
                                            <div className="mx-auto grid aspect-square w-full max-w-[140px] grid-cols-8 gap-[3px] rounded-lg bg-white p-2.5">
                                                {Array.from({ length: 64 }).map((_, index) => (
                                                    <span
                                                        key={index}
                                                        className={cn('rounded-[1px]', (index * 7) % 3 === 0 ? 'bg-neutral-900' : 'bg-transparent')}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-muted-foreground mt-3 text-center text-[10px]">Scan QRIS pakai aplikasi kamu</p>
                                        </div>

                                        <div className="bg-muted text-muted-foreground mt-3 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[10px] font-medium">
                                            <span className="border-muted-foreground/40 border-t-muted-foreground size-3 animate-spin rounded-full border-2" />
                                            Menunggu pembayaran
                                        </div>
                                    </div>
                                </PhoneMockup>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* Facts */}
                <Section className="py-14">
                    <dl className="grid grid-cols-2 gap-6 text-center lg:grid-cols-4">
                        {[
                            ['QRIS', 'Semua e-wallet & m-banking'],
                            ['0 akun', 'Yang bayar tak perlu daftar'],
                            [`${invoice_minutes} menit`, 'Masa berlaku satu QRIS'],
                            ['Rp0', 'Biaya bikin patungan'],
                        ].map(([value, label]) => (
                            <div key={label}>
                                <dt className="text-primary text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</dt>
                                <dd className="text-muted-foreground mt-1 text-[11px] leading-relaxed">{label}</dd>
                            </div>
                        ))}
                    </dl>
                </Section>

                {/* Features */}
                <div className="border-border bg-surface border-y">
                    <Section id="fitur" className="py-14 lg:py-20">
                        <div className="text-center">
                            <p className="text-primary text-[11px] font-bold tracking-wide uppercase">Fitur</p>
                            <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                                Semua yang bikin nagih jadi nggak perlu
                            </h2>
                        </div>

                        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {features.map((feature) => (
                                <li key={feature.title} className="border-border bg-card rounded-2xl border p-5">
                                    <span className="bg-brand-soft text-primary flex size-10 items-center justify-center rounded-xl">
                                        <feature.icon className="size-[18px]" strokeWidth={2.2} />
                                    </span>
                                    <h3 className="mt-3.5 text-sm font-bold tracking-tight">{feature.title}</h3>
                                    <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{feature.body}</p>
                                </li>
                            ))}
                        </ul>
                    </Section>
                </div>

                {/* Advantages */}
                <Section className="py-14 lg:py-20">
                    <div className="text-center">
                        <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                            Hal-hal kecil yang bikin bedanya kerasa
                        </h2>
                    </div>

                    <div className="mt-10 grid gap-3 sm:grid-cols-2">
                        {advantages.map((advantage) => (
                            <div key={advantage.title} className="border-border bg-card rounded-3xl border p-6">
                                <span className="bg-lime text-lime-foreground inline-flex size-8 items-center justify-center rounded-xl">
                                    <Check className="size-4" strokeWidth={3} />
                                </span>
                                <h3 className="mt-4 text-base font-bold tracking-tight">{advantage.title}</h3>
                                <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{advantage.body}</p>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Dashboard hub */}
                <div className="border-border bg-surface border-y">
                    <Section className="py-14 text-center lg:py-20">
                        <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                            Satu tempat buat pantau semuanya
                        </h2>
                        <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-sm leading-relaxed">
                            Siapa yang sudah bayar, berapa yang terkumpul, dan berapa saldo yang bisa dicairkan — semuanya di satu layar.
                        </p>

                        <Button asChild className="mt-6 h-11 rounded-full px-6 text-sm font-semibold">
                            <Link href={startHref}>Coba sekarang</Link>
                        </Button>

                        <div className="border-border bg-card mx-auto mt-10 max-w-4xl overflow-hidden rounded-3xl border shadow-xl">
                            <div className="surface-deep px-5 py-6 text-left sm:px-8 sm:py-8">
                                <p className="text-brand-deep-muted text-[11px]">Saldo tersedia</p>
                                <p className="text-brand-deep-foreground mt-1 text-3xl leading-none font-bold tracking-tight sm:text-4xl">
                                    Rp122.875
                                </p>
                                <div className="text-brand-deep-muted mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px]">
                                    <span>
                                        Pending <span className="text-brand-deep-foreground font-semibold">Rp0</span>
                                    </span>
                                    <span>
                                        Dicairkan <span className="text-brand-deep-foreground font-semibold">Rp0</span>
                                    </span>
                                </div>
                            </div>

                            <div className="grid gap-3 p-5 text-left sm:grid-cols-2 sm:p-6">
                                {[
                                    { title: 'Badminton Minggu Malam', sub: '5 dari 8 sudah bayar', value: 'Rp125.000', total: 'Rp200.000', pct: 62 },
                                    { title: 'Wedding Samarupa', sub: '1 dari 3 sudah bayar', value: 'Rp5.000.000', total: 'Rp16.500.000', pct: 30 },
                                ].map((card) => (
                                    <div key={card.title} className="border-border rounded-2xl border p-4">
                                        <div className="flex items-center gap-2.5">
                                            <CategoryIcon category="OLAHRAGA" size="sm" />
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-bold">{card.title}</p>
                                                <p className="text-muted-foreground text-[10px]">{card.sub}</p>
                                            </div>
                                        </div>
                                        <div className="bg-muted mt-3 h-1.5 overflow-hidden rounded-full">
                                            <div className="bg-lime h-full rounded-full" style={{ width: `${card.pct}%` }} />
                                        </div>
                                        <div className="mt-2 flex items-baseline justify-between">
                                            <span className="text-xs font-bold tabular-nums">{card.value}</span>
                                            <span className="text-muted-foreground text-[10px]">dari {card.total}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Section>
                </div>

                {/* Use cases */}
                <Section className="py-14 lg:py-20">
                    <div className="text-center">
                        <p className="text-primary text-[11px] font-bold tracking-wide uppercase">Dipakai buat apa</p>
                        <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                            Kalau ada yang harus dibagi, Patungan bisa
                        </h2>
                    </div>

                    <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {useCases.map((useCase) => (
                            <li key={useCase.title} className="border-border bg-card rounded-2xl border p-5">
                                <CategoryIcon category={useCase.category} />
                                <h3 className="mt-3.5 text-sm font-bold tracking-tight">{useCase.title}</h3>
                                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{useCase.body}</p>
                            </li>
                        ))}
                    </ul>
                </Section>

                {/* Fees */}
                <div className="border-border bg-surface border-y">
                    <Section id="biaya" className="py-14 lg:py-20">
                        <div className="text-center">
                            <p className="text-primary text-[11px] font-bold tracking-wide uppercase">Biaya</p>
                            <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                                Terbuka, tanpa biaya tersembunyi
                            </h2>
                            <p className="text-muted-foreground mx-auto mt-3 max-w-lg text-sm leading-relaxed">
                                Bikin patungan dan share link selalu gratis. Biaya baru muncul saat ada pembayaran yang benar-benar masuk.
                            </p>
                        </div>

                        <div className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-3">
                            {[
                                { label: 'Bikin patungan', value: 'Rp0', note: 'Berapa pun jumlah pesertanya' },
                                { label: 'Biaya layanan', value: platformFee, note: 'Per pembayaran yang berhasil' },
                                { label: 'Biaya payment gateway', value: gatewayFee, note: 'Diteruskan apa adanya' },
                            ].map((tier, index) => (
                                <div
                                    key={tier.label}
                                    className={cn(
                                        'rounded-3xl border p-6 text-center',
                                        index === 1 ? 'border-primary bg-card shadow-lg' : 'border-border bg-card',
                                    )}
                                >
                                    <p className="text-muted-foreground text-[11px] font-semibold">{tier.label}</p>
                                    <p className="text-primary mt-2 text-2xl font-extrabold tracking-tight">{tier.value}</p>
                                    <p className="text-muted-foreground mt-2 text-[11px] leading-relaxed">{tier.note}</p>
                                </div>
                            ))}
                        </div>

                        <div className="border-border bg-card mx-auto mt-4 max-w-3xl rounded-2xl border p-5">
                            <p className="text-sm font-bold tracking-tight">Contohnya begini</p>
                            <dl className="mt-3 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Tagihan per orang</dt>
                                    <dd className="font-semibold tabular-nums">Rp25.000</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Biaya payment gateway</dt>
                                    <dd className="tabular-nums">−Rp175</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Biaya layanan</dt>
                                    <dd className="tabular-nums">−Rp250</dd>
                                </div>
                                <div className="border-border flex justify-between border-t pt-2">
                                    <dt className="font-bold">Masuk ke saldo kamu</dt>
                                    <dd className="text-primary font-bold tabular-nums">Rp24.575</dd>
                                </div>
                            </dl>
                            <p className="text-muted-foreground mt-3 text-[11px] leading-relaxed">
                                {fees.bearer === 'payer'
                                    ? 'Saat ini biaya ditambahkan ke tagihan peserta, jadi kamu menerima penuh.'
                                    : 'Saat ini biaya ditanggung penyelenggara, jadi peserta membayar persis sebesar tagihannya.'}
                            </p>
                        </div>
                    </Section>
                </div>

                {/* FAQ */}
                <Section id="faq" className="py-14 lg:py-20">
                    <div className="text-center">
                        <h2 className="mx-auto max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                            Pertanyaan yang sering muncul
                        </h2>
                    </div>

                    <div className="mx-auto mt-10 max-w-2xl space-y-2.5">
                        {faqs.map((faq) => (
                            <details
                                key={faq.q}
                                className="group border-border bg-card rounded-2xl border px-5 py-4 [&_summary::-webkit-details-marker]:hidden"
                            >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                                    <span className="text-sm font-semibold tracking-tight">{faq.q}</span>
                                    <ChevronDown className="text-muted-foreground size-4 shrink-0 transition group-open:rotate-180" />
                                </summary>
                                <p className="text-muted-foreground mt-3 text-xs leading-relaxed">{faq.a}</p>
                            </details>
                        ))}
                    </div>

                    <p className="text-muted-foreground mt-8 text-center text-xs">
                        Masih ada yang mau ditanya?{' '}
                        <a href="mailto:patungan@trackertask.com" className="text-primary font-semibold">
                            patungan@trackertask.com
                        </a>
                    </p>
                </Section>

                {/* Final CTA */}
                <Section className="pb-16">
                    <div className="surface-deep rounded-[2rem] px-6 py-12 text-center sm:px-10 sm:py-16">
                        <h2 className="text-brand-deep-foreground mx-auto max-w-xl text-2xl font-extrabold tracking-tight sm:text-4xl">
                            Bikin patungan pertama kamu hari ini
                        </h2>
                        <p className="text-brand-deep-muted mx-auto mt-3 max-w-md text-sm leading-relaxed">
                            Gratis dibuat. Teman kamu cukup buka link dan bayar bagiannya.
                        </p>

                        <Button asChild className="bg-lime text-lime-foreground hover:bg-lime/90 mt-7 h-12 rounded-full px-8 text-sm font-bold">
                            <Link href={startHref}>
                                Buat patungan
                                <ArrowRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                </Section>

                {/* Footer */}
                <footer className="border-border border-t">
                    <Section className="py-12">
                        <div className="grid gap-8 sm:grid-cols-3">
                            <div>
                                <p className="text-muted-foreground text-[11px] font-semibold">Kontak</p>
                                <a href="mailto:patungan@trackertask.com" className="text-foreground mt-1.5 block text-sm font-semibold">
                                    patungan@trackertask.com
                                </a>
                            </div>

                            <div>
                                <p className="text-muted-foreground text-[11px] font-semibold">Produk</p>
                                <ul className="mt-1.5 space-y-1">
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
                                <p className="text-muted-foreground text-[11px] font-semibold">Mulai</p>
                                <ul className="mt-1.5 space-y-1">
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
                                </ul>
                            </div>
                        </div>

                        <div className="border-border mt-10 flex flex-col items-center gap-3 border-t pt-8 sm:flex-row sm:justify-between">
                            <p className="text-muted-foreground text-[11px]">© {new Date().getFullYear()} Patungan. Semua hak dilindungi.</p>
                            <AppLogoIcon className="size-7" />
                        </div>

                        {/* Oversized wordmark, like the reference */}
                        <p
                            aria-hidden="true"
                            className="text-primary/25 mt-6 -mb-4 text-center text-[clamp(3.5rem,17vw,12rem)] leading-[0.85] font-extrabold tracking-tighter select-none"
                        >
                            Patungan
                        </p>
                    </Section>
                </footer>
            </div>
        </>
    );
}
