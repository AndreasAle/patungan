import { cn } from '@/lib/utils';
import { useState } from 'react';

const paymentApps = [
    { name: 'GoPay', logo: '/images/brand/payment-gopay.jpg' },
    { name: 'OVO', logo: '/images/brand/payment-ovo.jpg' },
    { name: 'DANA', logo: '/images/brand/payment-dana.jpg' },
    { name: 'ShopeePay', logo: '/images/brand/payment-shopeepay.jpg' },
    { name: 'LinkAja', logo: '/images/brand/payment-linkaja.jpg' },
    { name: 'BCA mobile', logo: '/images/brand/payment-bca-mobile.jpg' },
    { name: "Livin' by Mandiri", logo: '/images/brand/payment-livin.jpg' },
    { name: 'BRImo', logo: '/images/brand/payment-brimo.jpg' },
    { name: 'Jenius', logo: '/images/brand/payment-jenius.jpg' },
    { name: 'blu by BCA Digital', logo: '/images/brand/payment-blu.jpg' },
] as const;

function PaymentLogoGroup({
    activeApp,
    onSelect,
    duplicate = false,
}: {
    activeApp: string | null;
    onSelect: (name: string) => void;
    duplicate?: boolean;
}) {
    return (
        <div className="payment-logo-group" aria-hidden={duplicate || undefined}>
            {paymentApps.map((app) => (
                <button
                    key={app.name}
                    type="button"
                    tabIndex={duplicate ? -1 : undefined}
                    aria-label={duplicate ? undefined : `Tampilkan warna logo ${app.name}`}
                    aria-pressed={duplicate ? undefined : activeApp === app.name}
                    onClick={() => onSelect(app.name)}
                    className={cn('payment-logo-card', activeApp === app.name && 'is-active')}
                >
                    <img src={app.logo} alt="" width={512} height={512} loading="lazy" className="payment-logo-image" />
                    <span>{app.name}</span>
                </button>
            ))}
        </div>
    );
}

export function PaymentLogoMarquee() {
    const [activeApp, setActiveApp] = useState<string | null>(null);
    const selectApp = (name: string) => setActiveApp((current) => (current === name ? null : name));

    return (
        <div>
            <p className="text-foreground/65 mb-3 text-center text-[10px] font-bold tracking-[0.14em] uppercase">Satu QRIS, banyak aplikasi</p>
            <div className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
                <span className="bg-card ring-border flex h-9 w-20 shrink-0 items-center justify-center rounded-full px-2.5 shadow-sm ring-1 sm:w-24">
                    <img src="/images/brand/payment-qris.svg" alt="QRIS" width={80} height={30} className="h-auto w-full" />
                </span>

                <div className="payment-logo-marquee" aria-label="Aplikasi yang dapat memindai QRIS">
                    <div className="payment-logo-track">
                        <PaymentLogoGroup activeApp={activeApp} onSelect={selectApp} />
                        <PaymentLogoGroup activeApp={activeApp} onSelect={selectApp} duplicate />
                    </div>
                </div>
            </div>
        </div>
    );
}
