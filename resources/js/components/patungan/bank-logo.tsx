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

/**
 * Real logo files, when we have one that is actually that bank's mark.
 *
 * Deliberately short. The images in this project are mobile-app icons, and
 * only these three are close enough to the bank's own mark to pass as one.
 * Dropping a proper file at the path below adds a bank here without touching
 * this component.
 */
const logoFiles: Record<string, string> = {
    bca: '/images/brand/payment-bca-mobile.jpg',
    bri: '/images/brand/payment-brimo.jpg',
    mandiri: '/images/brand/payment-livin.jpg',
    gopay: '/images/brand/payment-gopay.jpg',
    ovo: '/images/brand/payment-ovo.jpg',
    dana: '/images/brand/payment-dana.jpg',
    shopeepay: '/images/brand/payment-shopeepay.jpg',
    linkaja: '/images/brand/payment-linkaja.jpg',
};

const sizes = {
    sm: 'size-9 rounded-lg text-[10px]',
    md: 'size-11 rounded-xl text-xs',
    lg: 'size-14 rounded-2xl text-sm',
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
                <img src={source} alt="" width={112} height={112} className="size-full object-cover" onError={onError} loading="lazy" />
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
