import { cn } from '@/lib/utils';

/**
 * A tiny scene made from the same green and lime language as PATUNGAN.
 * It stays SVG so it is sharp, cheap to animate, and never blocks the balance.
 */
export function WalletHeroArt({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 260 220" className={cn('wallet-hero-art', className)} aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M38 46c18-34 60-42 91-23 19 12 29 4 51 8 45 8 65 55 47 94-17 36-19 65-65 78-42 11-104-2-127-36C10 130 18 84 38 46Z"
                fill="#1A6548"
                opacity=".72"
            />
            <circle cx="214" cy="28" r="5" fill="#C7F33D" className="wallet-art-spark" />
            <path d="m221 46 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#F8FFDE" className="wallet-art-spark wallet-art-spark-delay" />

            <g className="wallet-art-note">
                <path d="M54 52c20-14 45-19 68-10" fill="none" stroke="#C7F33D" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 7" />
                <text x="42" y="69" fill="#D9F7E8" fontSize="13" fontWeight="700" transform="rotate(-12 42 69)">
                    Bareng lebih ringan
                </text>
            </g>

            <g className="wallet-art-body">
                <rect x="91" y="101" width="116" height="86" rx="25" fill="#7DCF73" transform="rotate(8 91 101)" opacity=".7" />
                <rect x="76" y="113" width="128" height="80" rx="23" fill="#B8ED78" transform="rotate(-4 76 113)" />
                <rect x="82" y="125" width="132" height="76" rx="22" fill="#D6F59B" />
                <path d="M82 151h132v28H82z" fill="#A9DF63" opacity=".75" />
                <rect x="173" y="145" width="54" height="38" rx="15" fill="#0D4D37" />
                <circle cx="190" cy="164" r="5" fill="#C7F33D" />
            </g>

            <g className="wallet-art-coin">
                <circle cx="161" cy="91" r="31" fill="#F5FFB8" stroke="#C7F33D" strokeWidth="5" />
                <text x="161" y="99" textAnchor="middle" fill="#15563A" fontSize="22" fontWeight="900">
                    Rp
                </text>
            </g>

            <path
                d="M61 107c-7-3-12-8-15-15M53 118c-8 0-14-2-19-7"
                fill="none"
                stroke="#F8FFDE"
                strokeWidth="3"
                strokeLinecap="round"
                className="wallet-art-lines"
            />
        </svg>
    );
}
