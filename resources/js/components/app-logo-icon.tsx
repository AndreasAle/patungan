import { type SVGAttributes } from 'react';

interface AppLogoIconProps extends SVGAttributes<SVGElement> {
    /** Adds a white plate behind the mark so it stays legible on dark surfaces. */
    plate?: boolean;
}

/**
 * The Patungan mark: a deep green bowl with a lime leaf tucked into it, forming
 * a "P". Flat brand colours, no gradient.
 */
export default function AppLogoIcon({ plate = false, ...props }: AppLogoIconProps) {
    return (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            {plate && <rect width="64" height="64" rx="16" fill="#FFFFFF" />}

            {/* Bowl: rounded everywhere but the bottom-left corner. */}
            <path
                d={plate ? 'M20 34V22a10 10 0 0 1 10-10h4a11 11 0 0 1 0 22Z' : 'M16 40V22a15 15 0 0 1 15-15h5a16.5 16.5 0 0 1 0 33Z'}
                fill="#15563A"
            />

            {/* Leaf: rounded everywhere but the top-right corner, sitting in front. */}
            <path d={plate ? 'M34 30H24a10 10 0 0 0-10 10v2a10 10 0 0 0 20 0Z' : 'M37 27H26a15 15 0 0 0-15 15v2a15 15 0 0 0 30 0Z'} fill="#A6D93B" />
        </svg>
    );
}
