import { cn } from '@/lib/utils';

/** A restrained wallet illustration for the balance header. */
export function WalletHeroArt({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 220 178" className={cn('wallet-hero-art', className)} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <circle cx="123" cy="91" r="78" fill="#1A6548" opacity=".7" />
            <circle cx="181" cy="29" r="4" fill="#C7F33D" opacity=".85" />

            <g className="wallet-art-body">
                <rect x="70" y="72" width="112" height="76" rx="20" fill="#79C96B" opacity=".72" />
                <rect x="57" y="83" width="126" height="73" rx="21" fill="#C1EC79" />
                <path d="M57 111h126v24H57z" fill="#A4DB60" />
                <path d="M75 83h87c11.6 0 21 9.4 21 21v7H57v-10c0-9.9 8.1-18 18-18Z" fill="#DDF6A4" />
                <rect x="145" y="112" width="54" height="35" rx="14" fill="#0D4D37" />
                <circle cx="162" cy="129.5" r="4.5" fill="#C7F33D" />
            </g>

            <g className="wallet-art-coin">
                <circle cx="135" cy="62" r="29" fill="#F5FFBE" stroke="#C7F33D" strokeWidth="4" />
                <text x="135" y="69" textAnchor="middle" fill="#15563A" fontSize="21" fontWeight="800">
                    Rp
                </text>
            </g>
        </svg>
    );
}
