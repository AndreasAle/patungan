import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toLocalDateTimeInput } from '@/lib/format';
import { cn } from '@/lib/utils';

const presets = [
    { label: '24 jam', hours: 24 },
    { label: '3 hari', hours: 72 },
    { label: '7 hari', hours: 168 },
] as const;

interface DeadlinePickerProps {
    /** A `datetime-local` string, or '' for no deadline. */
    value: string;
    onChange: (value: string) => void;
    id?: string;
}

/**
 * Lets the organizer decide how long the share link keeps accepting payments.
 * Empty means the link stays open until they close the patungan themselves.
 */
export function DeadlinePicker({ value, onChange, id = 'expires_at' }: DeadlinePickerProps) {
    const setPreset = (hours: number) => {
        const target = new Date();
        target.setHours(target.getHours() + hours);
        onChange(toLocalDateTimeInput(target));
    };

    return (
        <div>
            <Label htmlFor={id}>Batas waktu pembayaran</Label>
            <p className="text-muted-foreground mt-0.5 text-xs">Setelah lewat batas ini, peserta tidak bisa bayar lagi lewat link.</p>

            <div className="mt-2 flex flex-wrap gap-2">
                {presets.map((preset) => (
                    <button
                        key={preset.label}
                        type="button"
                        onClick={() => setPreset(preset.hours)}
                        className="border-border text-muted-foreground hover:border-primary/40 hover:text-foreground h-8 rounded-full border px-3 text-[11px] font-semibold transition"
                    >
                        {preset.label}
                    </button>
                ))}
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className={cn(
                        'h-8 rounded-full border px-3 text-[11px] font-semibold transition',
                        value === ''
                            ? 'border-primary bg-brand-soft text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
                    )}
                >
                    Tanpa batas
                </button>
            </div>

            <Input id={id} type="datetime-local" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 rounded-xl" />
        </div>
    );
}
