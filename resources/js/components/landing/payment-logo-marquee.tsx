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

function PaymentLogoGroup({ duplicate = false }: { duplicate?: boolean }) {
    return (
        <div className="payment-logo-group" aria-hidden={duplicate || undefined}>
            {paymentApps.map((app) => (
                <div key={app.name} className="payment-logo-card" title={duplicate ? undefined : app.name}>
                    <img src={app.logo} alt={duplicate ? '' : app.name} width={512} height={512} loading="lazy" className="payment-logo-image" />
                </div>
            ))}
        </div>
    );
}

export function PaymentLogoMarquee() {
    return (
        <div className="grid items-center gap-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-7 lg:grid-cols-[11rem_minmax(0,1fr)]">
            <div className="flex items-center gap-3 sm:border-r sm:pr-7">
                <span className="bg-card ring-border flex h-14 w-24 shrink-0 items-center justify-center rounded-2xl px-3 shadow-sm ring-1">
                    <img src="/images/brand/payment-qris.svg" alt="QRIS" width={80} height={30} className="h-auto w-full" />
                </span>
                <span className="text-muted-foreground text-[10px] leading-tight font-bold tracking-[0.14em] uppercase sm:hidden">
                    Satu kode
                    <br />
                    banyak aplikasi
                </span>
            </div>

            <div className="payment-logo-marquee" aria-label="Aplikasi yang dapat memindai QRIS">
                <div className="payment-logo-track">
                    <PaymentLogoGroup />
                    <PaymentLogoGroup duplicate />
                </div>
            </div>
        </div>
    );
}
