import { cn } from '@/lib/utils';
import { useState } from 'react';

/**
 * Brand colours, used for the fallback tile.
 *
 * Only banks whose colour is unambiguous are listed. Guessing one wrong is
 * worse than not guessing: a wrong-coloured tile claiming to be a bank reads as
 * carelessness on the screen where somebody is about to move money. Anything
 * missing falls back to the product's own green, which claims nothing.
 */
const brandColours: Record<string, string> = {
    bca: '#0A5FA8',
    bni: '#E8621E',
    bri: '#00529C',
    mandiri: '#093A6E',
    jago: '#F26522',
    cimb: '#7A1B21',
    gopay: '#00AA13',
    ovo: '#4C2A86',
    dana: '#118EEA',
    shopeepay: '#EE4D2D',
    linkaja: '#E32629',
};

/** Wallet marks use the app artwork already shipped by the landing page. */
const logoFiles: Record<string, string> = {
    gopay: '/images/brand/payment-gopay.jpg',
    ovo: '/images/brand/payment-ovo.jpg',
    dana: '/images/brand/payment-dana.jpg',
    shopeepay: '/images/brand/payment-shopeepay.jpg',
    linkaja: '/images/brand/payment-linkaja.jpg',
};

const sizes = {
    sm: 'h-10 w-14 rounded-xl text-[10px]',
    md: 'h-12 w-16 rounded-xl text-xs',
    lg: 'h-16 w-24 rounded-2xl text-sm',
} as const;

/**
 * A bank or wallet mark, which always renders something legible.
 *
 * Preferred order: a file dropped at /images/banks/{code}.svg, then a known
 * app icon, then a monogram on the brand's colour. There is no fourth state
 * where the tile is empty - a blank square next to an account number is how a
 * withdrawal screen starts looking untrustworthy.
 */
export function BankLogo({ code, label, size = 'md', className }: { code: string; label: string; size?: keyof typeof sizes; className?: string }) {
    // Tried first, and quietly abandoned if it is not there.
    const [source, setSource] = useState<string | null>(`/images/banks/${code}.svg`);
    const [fellBackToFile, setFellBackToFile] = useState(false);

    const onError = () => {
        if (!fellBackToFile && logoFiles[code]) {
            setFellBackToFile(true);
            setSource(logoFiles[code]);

            return;
        }

        setSource(null);
    };

    if (source !== null) {
        return (
            <span className={cn('bg-card ring-border flex shrink-0 items-center justify-center overflow-hidden ring-1', sizes[size], className)}>
                <img
                    src={source}
                    alt={`${label} logo`}
                    width={144}
                    height={96}
                    className="size-full object-contain p-1.5"
                    onError={onError}
                    loading="lazy"
                />
            </span>
        );
    }

    const initials = label
        .replace(/bank\s+/i, '')
        .split(/\s+/)
        .map((word) => word[0])
        .join('')
        .slice(0, 3)
        .toUpperCase();

    return (
        <span
            aria-hidden="true"
            style={{ backgroundColor: brandColours[code] ?? 'var(--color-primary)' }}
            className={cn('flex shrink-0 items-center justify-center font-bold tracking-tight text-white', sizes[size], className)}
        >
            {initials}
        </span>
    );
}
