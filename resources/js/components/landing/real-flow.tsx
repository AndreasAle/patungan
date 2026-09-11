import { cn } from '@/lib/utils';
import { Link } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Check, ClipboardPaste, MessageCircle, Search, Trophy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

const flowSteps = [
    {
        eyebrow: 'Mulai',
        title: 'Isi yang penting saja.',
        body: 'Kasih judul, pilih kategori, lalu lanjut. Nggak ada form panjang yang bikin malas duluan.',
    },
    {
        eyebrow: 'Bagi tagihan',
        title: 'Pilih sama rata atau beda.',
        body: 'Tentukan nominal sekali. Kalau perlu, tiap orang juga bisa punya tagihan yang berbeda.',
    },
    {
        eyebrow: 'Tambah teman',
        title: 'Tempel daftar dari grup.',
        body: 'Salin nama dari WhatsApp, tempel, dan daftar peserta langsung tersusun otomatis.',
    },
    {
        eyebrow: 'Bagikan',
        title: 'Satu klik ke WhatsApp.',
        body: 'Setelah dibuat, link dan pesan undangan sudah siap dikirim ke grup.',
    },
    {
        eyebrow: 'Teman membayar',
        title: 'Mereka pilih namanya sendiri.',
        body: 'Tanpa daftar dan tanpa login. Buka link, cari nama, lalu tekan Bayar.',
    },
    {
        eyebrow: 'Selesai',
        title: 'Scan QRIS, langsung tercatat.',
        body: 'Nominal sudah dikunci. Begitu pembayaran masuk, status dan progres Patungan berubah otomatis.',
    },
] as const;

function Phone({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
    return (
        <div className="relative mx-auto w-full max-w-[16rem] rounded-[2.25rem] bg-[#091612] p-[6px] shadow-[0_24px_60px_rgba(0,0,0,0.32)] ring-1 ring-white/15 sm:max-w-[17rem] sm:rounded-[2.5rem] sm:p-[7px]">
            {/*
                Shorter than it was, and the body is a flex column.
                
                At a fixed 34rem the shortest screen - the success step - ran out
                of content two thirds of the way down and left a slab of empty
                white inside the mockup, which read as a rendering bug rather
                than as a phone.
            */}
            <div
                className={cn(
                    'relative flex h-[27.5rem] flex-col overflow-hidden rounded-[1.85rem] sm:h-[29rem] sm:rounded-[2.05rem]',
                    dark ? 'bg-[#101413]' : 'bg-[#f3f7f5]',
                )}
            >
                <div className="absolute top-2 left-1/2 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-[#09100e]" />
                <div
                    className={cn(
                        'relative z-10 flex h-8 items-center justify-between px-4 pt-1 text-[7px] font-bold',
                        dark ? 'text-white' : 'text-[#10251e]',
                    )}
                >
                    <span>00.03</span>
                    <span className="tracking-widest">● ᯤ ▰</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
            </div>
        </div>
    );
}

function WizardHeader({ step, title, hint }: { step: number; title: string; hint: string }) {
    return (
        <div className="bg-[linear-gradient(145deg,#064a34,#0d6b49)] px-4 pt-3 pb-4 text-white">
            <p className="text-[7px] font-bold tracking-[0.18em] text-[#c9f34f] uppercase">Langkah {step} dari 4</p>
            <p className="mt-1 text-lg leading-none font-black tracking-tight">{title}</p>
            <p className="mt-1 text-[8px] text-white/65">{hint}</p>
            <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4].map((item) => (
                    <span key={item} className={cn('h-1 flex-1 rounded-full', item <= step ? 'bg-[#c9f34f]' : 'bg-white/20')} />
                ))}
            </div>
        </div>
    );
}

function MiniCard({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-2xl border border-[#dbe6e1] bg-white p-3 shadow-sm">
            <p className="text-[8px] font-bold tracking-[0.1em] text-[#466158] uppercase">{title}</p>
            <div className="mt-2">{children}</div>
        </div>
    );
}

function DetailScreen() {
    return (
        <Phone>
            <WizardHeader step={1} title="Detail" hint="Patungan buat apa?" />
            <div className="space-y-2 p-3">
                <MiniCard title="Judul patungan">
                    <div className="rounded-lg border border-[#d9e3df] bg-[#f8faf9] px-2.5 py-2 text-[9px] font-semibold">Badminton Minggu Malam</div>
                    <p className="mt-2 text-[7px] font-semibold text-[#65786f]">Deskripsi (opsional)</p>
                    <div className="mt-1 rounded-lg border border-[#d9e3df] bg-[#f8faf9] px-2.5 py-2 text-[8px]">Sewa lapangan 2 jam</div>
                </MiniCard>
                <MiniCard title="Kategori">
                    <div className="grid grid-cols-4 gap-1.5">
                        {['🏸', '🍽️', '🎁', '🏝️'].map((icon, index) => (
                            <div
                                key={icon}
                                className={cn(
                                    'rounded-xl border px-1 py-2 text-center text-base',
                                    index === 0 ? 'border-[#08734e] bg-[#e9f8f1]' : 'border-[#e2e9e6]',
                                )}
                            >
                                {icon}
                            </div>
                        ))}
                    </div>
                </MiniCard>
                <div className="rounded-xl bg-[#076744] py-2.5 text-center text-[9px] font-bold text-white">Lanjut →</div>
            </div>
        </Phone>
    );
}

function SplitScreen() {
    return (
        <Phone>
            <WizardHeader step={2} title="Pembagian" hint="Siapa bayar berapa?" />
            <div className="space-y-2 p-3">
                <MiniCard title="Jenis pembagian">
                    <div className="rounded-xl border border-[#08734e] bg-[#e9f8f1] p-2.5">
                        <p className="text-[10px] font-bold text-[#07583d]">Sama rata</p>
                        <p className="mt-0.5 text-[7px] text-[#527067]">Semua orang bayar nominal yang sama.</p>
                    </div>
                    <div className="mt-1.5 rounded-xl border border-[#dfe7e3] p-2.5">
                        <p className="text-[10px] font-bold">Nominal berbeda</p>
                    </div>
                </MiniCard>
                <MiniCard title="Nominal per orang">
                    <div className="rounded-lg border border-[#d9e3df] px-2.5 py-2 text-[12px] font-black text-[#073f2e]">Rp25.000</div>
                    <div className="mt-2 flex gap-1">
                        {['10rb', '20rb', '25rb', '50rb'].map((amount) => (
                            <span key={amount} className="flex-1 rounded-full border border-[#dce5e1] py-1.5 text-center text-[7px] font-semibold">
                                {amount}
                            </span>
                        ))}
                    </div>
                </MiniCard>
                <div className="rounded-xl bg-[#076744] py-2.5 text-center text-[9px] font-bold text-white">Lanjut →</div>
            </div>
        </Phone>
    );
}

function ParticipantScreen() {
    const names = ['Vincen', 'Nopit', 'Nicogay'];

    return (
        <Phone>
            <WizardHeader step={3} title="Peserta" hint="Siapa aja yang ikut?" />
            <div className="space-y-2 p-3">
                <MiniCard title="Tambah peserta">
                    <div className="flex items-center gap-2 rounded-xl bg-[#eaf7f1] p-2.5 text-[#076744]">
                        <ClipboardPaste className="size-4" />
                        <span className="text-[9px] font-bold">Tempel daftar dari WhatsApp</span>
                    </div>
                </MiniCard>
                <MiniCard title="Daftar peserta · 8">
                    <div className="space-y-1.5">
                        {names.map((name, index) => (
                            <div key={name} className="flex items-center rounded-lg border border-[#e0e8e4] px-2 py-1.5">
                                <span className="flex size-5 items-center justify-center rounded-full bg-[#e9f8f1] text-[7px] font-bold text-[#08734e]">
                                    {index + 1}
                                </span>
                                <span className="ml-2 flex-1 text-[8px] font-semibold">{name}</span>
                                <span className="text-[7px] text-[#587067]">Rp25.000</span>
                            </div>
                        ))}
                    </div>
                </MiniCard>
                <div className="rounded-xl bg-[#076744] py-2.5 text-center text-[9px] font-bold text-white">Review →</div>
            </div>
        </Phone>
    );
}

function ShareScreen() {
    return (
        <Phone>
            <div className="bg-[#0a5b3f] px-4 py-2.5 text-[10px] font-bold text-white">✓ Berhasil dibuat</div>
            <div className="flex flex-1 flex-col justify-center p-3 text-center">
                <span className="mx-auto mt-2 flex size-12 items-center justify-center rounded-2xl bg-[#dff7eb] text-[#08734e]">
                    <Check className="size-6" strokeWidth={3} />
                </span>
                <p className="mt-3 text-[8px] font-bold tracking-[0.14em] text-[#64776f] uppercase">Patungan berhasil dibuat</p>
                <div className="mt-3 rounded-2xl border border-[#dbe6e1] bg-white p-4 shadow-sm">
                    <Trophy className="mx-auto size-5 text-[#08734e]" />
                    <p className="mt-2 text-sm font-black">Badminton</p>
                    <div className="mt-4 grid grid-cols-3 divide-x divide-[#e2e9e6]">
                        {[
                            ['Peserta', '8 orang'],
                            ['Per orang', 'Rp25.000'],
                            ['Target', 'Rp200.000'],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <p className="text-[7px] text-[#64776f]">{label}</p>
                                <p className="mt-1 text-[8px] font-bold">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-[#08734e] py-3 text-[9px] font-bold text-white">
                    <MessageCircle className="size-4" /> Bagikan ke WhatsApp
                </div>
                <p className="mt-3 truncate rounded-lg bg-[#eaf0ed] px-3 py-2 font-mono text-[7px] text-[#587067]">patungan.conweb.id/p/8f2...</p>
            </div>
        </Phone>
    );
}

function PublicScreen() {
    const names = ['Vincen', 'Nopit', 'Nicogay', 'Sangkat'];

    return (
        <Phone>
            <div className="px-3 pt-2">
                <div className="rounded-2xl bg-[linear-gradient(145deg,#064a34,#0d6b49)] p-4 text-white">
                    <div className="flex items-center gap-2">
                        <Trophy className="size-4 text-[#c9f34f]" />
                        <div>
                            <p className="text-sm font-black">Badminton</p>
                            <p className="text-[7px] text-white/60">Rp25.000 / orang</p>
                        </div>
                    </div>
                    <p className="mt-4 text-[7px] font-bold tracking-widest text-[#c9f34f] uppercase">Terkumpul</p>
                    <p className="mt-1 text-2xl font-black">Rp0</p>
                    <div className="mt-2 h-1 rounded-full bg-white/20">
                        <div className="h-full w-[8%] rounded-full bg-[#c9f34f]" />
                    </div>
                    <p className="mt-1.5 text-[7px] text-white/60">0 dari 8 sudah bayar</p>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#dce5e1] bg-white px-3 py-2.5 text-[#708078]">
                    <Search className="size-3.5" />
                    <span className="text-[8px]">Cari nama kamu...</span>
                </div>
                <div className="mt-2 space-y-1.5">
                    {names.map((name) => (
                        <div key={name} className="flex items-center rounded-xl border border-[#e0e8e4] bg-white p-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-[#e9f8f1] text-[8px] font-bold text-[#08734e]">
                                {name[0]}
                            </span>
                            <div className="ml-2 flex-1">
                                <p className="text-[8px] font-bold">{name}</p>
                                <p className="text-[7px] text-[#65786f]">Rp25.000</p>
                            </div>
                            <span className="rounded-lg bg-[#08734e] px-2.5 py-1.5 text-[7px] font-bold text-white">Bayar</span>
                        </div>
                    ))}
                </div>
            </div>
        </Phone>
    );
}

function PaymentScreen() {
    return (
        <Phone>
            <div className="bg-[#0a5b3f] px-4 py-3 text-center text-[10px] font-bold text-white">Bayar Rp25.000</div>
            <div className="p-3">
                <div className="rounded-2xl bg-[linear-gradient(145deg,#064a34,#0d6b49)] p-4 text-center text-white">
                    <p className="text-[7px] font-bold tracking-widest text-white/60 uppercase">Bayar</p>
                    <p className="mt-1 text-2xl font-black">Rp25.000</p>
                    <p className="mt-1 text-[8px] text-white/60">untuk Vincen · Badminton</p>
                </div>
                <div className="mt-2 rounded-2xl border border-[#dce5e1] bg-white p-4 text-center shadow-sm">
                    <QRCodeSVG value="https://patungan.conweb.id" level="M" className="mx-auto size-36" />
                    <p className="mt-3 text-[10px] font-bold">Scan QRIS untuk membayar</p>
                    <img src="/images/brand/payment-qris.svg" alt="" className="mx-auto mt-2 h-5 w-auto" />
                </div>
                <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#dff7eb] px-3 py-2.5 text-[#08734e]">
                    <Check className="size-4" strokeWidth={3} />
                    <span className="text-[9px] font-bold">Status tercatat otomatis</span>
                </div>
            </div>
        </Phone>
    );
}

const screens = [DetailScreen, SplitScreen, ParticipantScreen, ShareScreen, PublicScreen, PaymentScreen] as const;

export function RealFlow({ startHref }: { startHref: string }) {
    const [activeStep, setActiveStep] = useState(0);
    const railRef = useRef<HTMLDivElement | null>(null);
    const stepRefs = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;

        let frame = 0;
        const updateActiveStep = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
                if (rail.scrollLeft < 8) {
                    setActiveStep(0);
                    return;
                }

                const center = rail.scrollLeft + rail.clientWidth / 2;
                const closest = stepRefs.current.reduce(
                    (best, node, index) => {
                        if (!node) return best;
                        const distance = Math.abs(node.offsetLeft + node.offsetWidth / 2 - center);
                        return distance < best.distance ? { index, distance } : best;
                    },
                    { index: 0, distance: Number.POSITIVE_INFINITY },
                );
                setActiveStep(closest.index);
            });
        };

        rail.addEventListener('scroll', updateActiveStep, { passive: true });
        return () => {
            cancelAnimationFrame(frame);
            rail.removeEventListener('scroll', updateActiveStep);
        };
    }, []);

    const goToStep = (index: number) => {
        const next = Math.max(0, Math.min(flowSteps.length - 1, index));
        stepRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        setActiveStep(next);
    };

    return (
        <div className="w-full max-w-full min-w-0 overflow-hidden">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-lime flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] uppercase before:h-px before:w-6 before:bg-current">
                        Cara kerja
                    </p>
                    <h2 className="display text-brand-deep-foreground mt-4 max-w-xl text-[32px] sm:text-5xl">Lihat flow aslinya. Sesimpel itu.</h2>
                    <p className="text-brand-deep-muted mt-4 max-w-lg text-sm leading-relaxed">
                        Geser ke samping untuk melihat alur nyata dari bikin Patungan sampai pembayaran tercatat.
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={() => goToStep(activeStep - 1)}
                        disabled={activeStep === 0}
                        aria-label="Langkah sebelumnya"
                        className="flow-nav-button"
                    >
                        <ArrowLeft className="size-4" />
                    </button>
                    <span className="text-brand-deep-foreground min-w-12 text-center text-xs font-bold tabular-nums">
                        {String(activeStep + 1).padStart(2, '0')} / {String(flowSteps.length).padStart(2, '0')}
                    </span>
                    <button
                        type="button"
                        onClick={() => goToStep(activeStep + 1)}
                        disabled={activeStep === flowSteps.length - 1}
                        aria-label="Langkah berikutnya"
                        className="flow-nav-button"
                    >
                        <ArrowRight className="size-4" />
                    </button>
                </div>
            </div>

            <div ref={railRef} className="real-flow-rail mt-9" aria-label="Alur penggunaan Patungan">
                {flowSteps.map((step, index) => {
                    const Screen = screens[index];
                    return (
                        <article
                            id={`flow-step-${index + 1}`}
                            key={step.title}
                            ref={(node) => {
                                stepRefs.current[index] = node;
                            }}
                            data-step={index}
                            className="real-flow-card"
                        >
                            <div className="mb-4 px-1 sm:mb-5 sm:min-h-[7.25rem]">
                                <p className="text-lime text-[10px] font-bold tracking-[0.16em] uppercase">
                                    {String(index + 1).padStart(2, '0')} · {step.eyebrow}
                                </p>
                                <h3 className="text-brand-deep-foreground mt-2 text-xl font-bold tracking-tight">{step.title}</h3>
                                <p className="text-brand-deep-muted mt-2 text-sm leading-relaxed">{step.body}</p>
                            </div>
                            <Screen />
                        </article>
                    );
                })}
                <div className="w-1 shrink-0" aria-hidden="true" />
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-5">
                <ol className="flex items-center gap-2" aria-label="Tahapan membuat Patungan">
                    {flowSteps.map((step, index) => (
                        <li key={step.title}>
                            <button
                                type="button"
                                onClick={() => goToStep(index)}
                                aria-label={`Langkah ${index + 1}: ${step.title}`}
                                aria-current={activeStep === index ? 'step' : undefined}
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-full text-[10px] font-bold transition',
                                    activeStep === index ? 'bg-lime text-lime-foreground scale-110' : 'bg-white/10 text-white/55 hover:bg-white/20',
                                )}
                            >
                                {index + 1}
                            </button>
                        </li>
                    ))}
                </ol>

                <Link
                    href={startHref}
                    className="bg-lime text-lime-foreground inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-bold transition hover:-translate-y-0.5"
                >
                    Coba bikin sendiri <ArrowRight className="size-4" />
                </Link>
            </div>
        </div>
    );
}
