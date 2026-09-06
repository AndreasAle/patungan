/** Rupiah formatting. Amounts are always whole rupiah, never floats. */
export function rupiah(amount: number): string {
    return `Rp${Math.round(amount).toLocaleString('id-ID')}`;
}

/** Compact form for tight spots, e.g. "Rp1,2jt". */
export function rupiahShort(amount: number): string {
    if (amount >= 1_000_000) {
        return `Rp${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1).replace('.', ',')}jt`;
    }

    if (amount >= 10_000) {
        return `Rp${Math.round(amount / 1000)}rb`;
    }

    return rupiah(amount);
}

export function parseRupiahInput(value: string): number {
    const digits = value.replace(/\D/g, '');

    return digits === '' ? 0 : Number.parseInt(digits, 10);
}

export function formatDate(iso: string | null): string {
    if (!iso) return '-';

    return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(iso: string | null): string {
    if (!iso) return '-';

    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso: string | null): string {
    if (!iso) return '-';

    return `${formatDate(iso)} ${formatTime(iso)}`;
}

/** Remaining time as "mm:ss", or null once the deadline has passed. */
export function countdown(target: string | null, now: number): string | null {
    if (!target) return null;

    const remaining = new Date(target).getTime() - now;

    if (remaining <= 0) return null;

    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function percentage(value: number, total: number): number {
    if (total <= 0) return 0;

    return Math.min(100, Math.round((value / total) * 100));
}

/** Formats a Date for a `datetime-local` input, in the viewer's own timezone. */
export function toLocalDateTimeInput(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Coarse "time left" copy for a payment deadline, e.g. "2 hari lagi". */
export function timeLeft(iso: string | null, now: number): string | null {
    if (!iso) return null;

    const remaining = new Date(iso).getTime() - now;

    if (remaining <= 0) return null;

    const minutes = Math.floor(remaining / 60000);

    if (minutes < 60) return `${minutes} menit lagi`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours} jam lagi`;

    return `${Math.floor(hours / 24)} hari lagi`;
}
