/** Providers most of our users are on, worth catching a typo for. */
const PROVIDERS = [
    'gmail.com',
    'yahoo.com',
    'yahoo.co.id',
    'outlook.com',
    'hotmail.com',
    'icloud.com',
    'proton.me',
    'protonmail.com',
    'live.com',
    'aol.com',
];

/** Levenshtein distance, capped early once it is clearly too far. */
function distance(a: string, b: string): number {
    if (Math.abs(a.length - b.length) > 2) return 99;

    let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

    for (let i = 1; i <= a.length; i++) {
        const current = [i];

        for (let j = 1; j <= b.length; j++) {
            current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        }

        previous = current;
    }

    return previous[b.length];
}

/**
 * Suggests the provider an address was probably meant to use.
 *
 * A domain like "gmial.com" is really registered, so it passes a DNS check and
 * the verification link simply never arrives. Catching it at the keyboard saves
 * the user that dead end. Returns null when nothing looks off.
 */
export function suggestEmail(email: string): string | null {
    const at = email.lastIndexOf('@');

    if (at < 1) return null;

    const local = email.slice(0, at);
    const domain = email
        .slice(at + 1)
        .toLowerCase()
        .trim();

    if (domain === '' || PROVIDERS.includes(domain)) return null;

    for (const provider of PROVIDERS) {
        if (distance(domain, provider) <= 2) {
            return `${local}@${provider}`;
        }
    }

    return null;
}
