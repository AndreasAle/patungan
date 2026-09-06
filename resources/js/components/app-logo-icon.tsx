import type { SVGAttributes } from 'react';

/** Three overlapping discs - a group splitting one bill. */
export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
            <rect width="32" height="32" rx="9" fill="currentColor" />
            <circle cx="12" cy="13" r="5" fill="white" fillOpacity="0.95" />
            <circle cx="20" cy="13" r="5" fill="white" fillOpacity="0.55" />
            <rect x="8" y="20" width="16" height="3.5" rx="1.75" fill="white" fillOpacity="0.85" />
        </svg>
    );
}
