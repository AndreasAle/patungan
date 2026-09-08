import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useMemo, useState, type ComponentProps } from 'react';

/** The server rule is Password::defaults(), which is a minimum of eight. */
const MINIMUM = 8;

type Strength = {
    score: 0 | 1 | 2 | 3;
    label: string;
    hint: string;
    tone: string;
    track: string;
};

/**
 * Rates a password that the server would already accept.
 *
 * Anything under the minimum is not "weak", it is refused - so that case is
 * reported as the rule it breaks rather than as a score. Above the minimum the
 * rating is advice, and says so.
 */
function rate(value: string): Strength | null {
    if (value === '') return null;

    if (value.length < MINIMUM) {
        return {
            score: 0,
            label: 'Terlalu pendek',
            hint: `Minimal ${MINIMUM} karakter.`,
            tone: 'text-destructive',
            track: 'bg-destructive',
        };
    }

    let points = 0;
    if (value.length >= 12) points++;
    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) points++;
    if (/\d/.test(value)) points++;
    if (/[^A-Za-z0-9]/.test(value)) points++;

    if (points <= 1) {
        return {
            score: 1,
            label: 'Lemah',
            hint: 'Tambah huruf besar, angka, atau simbol.',
            tone: 'text-warning',
            track: 'bg-warning',
        };
    }

    if (points === 2) {
        return {
            score: 2,
            label: 'Sedang',
            hint: 'Lumayan. Panjangkan lagi biar makin aman.',
            tone: 'text-warning',
            track: 'bg-warning',
        };
    }

    return {
        score: 3,
        label: 'Kuat',
        hint: 'Bagus. Password ini sulit ditebak.',
        tone: 'text-success',
        track: 'bg-success',
    };
}

interface PasswordInputProps extends Omit<ComponentProps<typeof Input>, 'type'> {
    /** Rate the password as it is typed. Off for sign-in, where rating an existing password helps nobody. */
    showStrength?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
    { showStrength = false, className, value, ...props },
    ref,
) {
    const [visible, setVisible] = useState(false);
    const meterId = useId();

    const text = typeof value === 'string' ? value : '';
    const strength = useMemo(() => (showStrength ? rate(text) : null), [showStrength, text]);

    return (
        <div>
            <div className="relative">
                <Input
                    {...props}
                    ref={ref}
                    value={value}
                    type={visible ? 'text' : 'password'}
                    aria-describedby={strength ? meterId : undefined}
                    className={cn('h-12 rounded-xl pr-12', className)}
                />

                <button
                    type="button"
                    onClick={() => setVisible((shown) => !shown)}
                    aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
                    aria-pressed={visible}
                    // Not in the tab order: it is a convenience, and stopping here on
                    // the way to the submit button would be a nuisance.
                    tabIndex={-1}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-12 items-center justify-center transition"
                >
                    {visible ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                </button>
            </div>

            {strength && (
                <div id={meterId} className="mt-2.5">
                    <div className="flex gap-1.5" aria-hidden="true">
                        {[1, 2, 3].map((step) => (
                            <span
                                key={step}
                                className={cn(
                                    'h-1 flex-1 rounded-full transition-colors duration-300',
                                    strength.score >= step ? strength.track : 'bg-muted',
                                )}
                            />
                        ))}
                    </div>

                    <p className="mt-1.5 text-[11px] leading-relaxed">
                        <span className={cn('font-bold', strength.tone)}>{strength.label}</span>
                        <span className="text-muted-foreground"> · {strength.hint}</span>
                    </p>
                </div>
            )}
        </div>
    );
});
