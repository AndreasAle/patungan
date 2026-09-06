export interface ParsedName {
    name: string;
    note: string | null;
}

const NUMBERED = /^\d+\s*[.)\-:]\s*/;
const BULLET = /^[-–—•*]\s+/;
/** A trailing role in brackets, e.g. "Rizko (kiper)". */
const TRAILING_ROLE = /^(.*?)\s*[(（]([^)）]{1,30})[)）]\s*$/;
/** Times like "20.00-22.00" or "20:00 - 22:00". */
const TIME_RANGE = /^\d{1,2}[.:]\d{2}\s*[-–—]?\s*(\d{1,2}[.:]\d{2})?$/;

const MAX_NAME_LENGTH = 60;

function looksLikeHeading(line: string): boolean {
    if (line.endsWith(':')) return true;
    if (TIME_RANGE.test(line)) return true;
    // No letters at all, e.g. a stray date or separator row.
    if (!/\p{L}/u.test(line)) return true;

    return false;
}

function clean(line: string): ParsedName | null {
    const withoutMarker = line.replace(NUMBERED, '').replace(BULLET, '').trim();

    if (withoutMarker === '' || withoutMarker.length > MAX_NAME_LENGTH) return null;
    if (looksLikeHeading(withoutMarker)) return null;

    const role = withoutMarker.match(TRAILING_ROLE);

    if (role) {
        const name = role[1].trim();

        // "(kiper)" on its own is a heading, not a person.
        if (name === '') return null;

        return { name, note: role[2].trim() };
    }

    return { name: withoutMarker, note: null };
}

/**
 * Turns a roster pasted from a group chat into participants.
 *
 * When the text contains a numbered or bulleted list - the usual WhatsApp
 * line-up - only those entries are taken, so headings like "Tim A (baju ijo)"
 * and the session time are skipped. Otherwise every line counts as one name.
 * Duplicates are kept: two people really can share a name.
 */
export function parseNames(raw: string): ParsedName[] {
    const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== '');

    const listed = lines.filter((line) => NUMBERED.test(line) || BULLET.test(line));
    const source = listed.length > 0 ? listed : lines;

    return source.map(clean).filter((entry): entry is ParsedName => entry !== null);
}

/** Single-field entry: one name, or several separated by commas or newlines. */
export function parseQuickNames(raw: string): ParsedName[] {
    return parseNames(raw.split(',').join('\n'));
}
