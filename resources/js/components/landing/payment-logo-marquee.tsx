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

/**
 * One group of logos. Rendered twice so the ribbon can loop seamlessly.
 *
 * These are not buttons. An earlier version made each one clickable to reveal
 * its colour, which was a gimmick pretending to be a feature: it announced ten
 * interactive controls to a screen reader that do nothing, and on a phone -
 * where most of this traffic is - there is no hover, so nobody ever found it.
 */
function PaymentLogoGroup({ duplicate = false }: { duplicate?: boolean }) {
    return (
        <div className="payment-logo-group" aria-hidden={duplicate || undefined}>
            {paymentApps.map((app) => (
                <span key={app.name} className="payment-logo-card">
                    <img src={app.logo} alt="" width={512} height={512} loading="lazy" className="payment-logo-image" />
                    <span>{app.name}</span>
                </span>
            ))}
        </div>
    );
}

/**
 * The "any of these apps can scan it" ribbon.
 *
 * The logos are shown in full colour, and that is the whole point of the
 * section. People recognise OVO and GoPay by their colour before they read the
 * word, so desaturating them removes the one thing that makes this strip do its
 * job - it stops reading as "these all work" and starts reading as a row of
 * broken images.
 */
export function PaymentLogoMarquee() {
    return (
        <div>
            <p className="text-foreground/70 mb-4 text-center text-[10px] font-bold tracking-[0.16em] uppercase">Satu QRIS, banyak aplikasi</p>

            <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5">
                <span className="bg-card ring-border flex h-11 shrink-0 items-center justify-center rounded-2xl px-3 shadow-sm ring-1">
                    <img src="/images/brand/payment-qris.svg" alt="QRIS" width={80} height={30} className="h-auto w-full" />
                </span>

                <div className="payment-logo-marquee" aria-label="Aplikasi yang dapat memindai QRIS">
                    <div className="payment-logo-track">
                        <PaymentLogoGroup />
                        <PaymentLogoGroup duplicate />
                    </div>
                </div>
            </div>
        </div>
    );
}
