import { Input } from '@/components/ui/input';
import { parseRupiahInput } from '@/lib/format';
import { cn } from '@/lib/utils';

interface RupiahInputProps {
    value: number;
    onChange: (value: number) => void;
    id?: string;
    placeholder?: string;
    className?: string;
    'aria-label'?: string;
}

/** Digit-only money field. The value stays an integer number of rupiah. */
export function RupiahInput({ value, onChange, id, placeholder = '0', className, ...rest }: RupiahInputProps) {
    return (
        <div className={cn('relative', className)}>
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm font-semibold">Rp</span>
            <Input
                id={id}
                inputMode="numeric"
                autoComplete="off"
                value={value === 0 ? '' : value.toLocaleString('id-ID')}
                onChange={(event) => onChange(parseRupiahInput(event.target.value))}
                placeholder={placeholder}
                aria-label={rest['aria-label']}
                className="h-11 rounded-xl pl-9 font-semibold tabular-nums"
            />
        </div>
    );
}
