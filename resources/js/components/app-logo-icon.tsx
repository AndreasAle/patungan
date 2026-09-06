import { useId, type SVGAttributes } from 'react';

/**
 * The Patungan mark: two leaf shapes forming a "P" - a bright bowl and a deep
 * stem that overlap in the middle. Gradient ids are unique per instance so
 * several logos can render on one page.
 */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    const id = useId();
    const bright = `${id}-bright`;
    const deep = `${id}-deep`;

    return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <defs>
                <linearGradient id={bright} x1="14" y1="8" x2="52" y2="38" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#34D07C" />
                    <stop offset="1" stopColor="#10A050" />
                </linearGradient>
                <linearGradient id={deep} x1="8" y1="26" x2="38" y2="58" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0F8A4A" />
                    <stop offset="1" stopColor="#065E38" />
                </linearGradient>
            </defs>

            {/* Bowl: rounded everywhere but the bottom-left corner. */}
            <path d="M14 38V23A15 15 0 0 1 29 8h8a15 15 0 0 1 0 30Z" fill={`url(#${bright})`} />

            {/* Stem: rounded everywhere but the top-right corner, overlapping the bowl. */}
            <path d="M38 26H23a15 15 0 0 0-15 15v2a15 15 0 0 0 30 0Z" fill={`url(#${deep})`} />
        </svg>
    );
}
