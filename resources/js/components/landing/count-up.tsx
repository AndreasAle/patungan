import { rupiah } from '@/lib/format';
import { useEffect, useRef, useState } from 'react';

/** Ease-out, so the number decelerates into its final value instead of stopping dead. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const DURATION = 550;

interface CountUpProps {
    value: number;
    /** Start from zero the first time rather than counting from nothing visible. */
    from?: number;
    className?: string;
}

/**
 * A rupiah figure that counts to its value when it changes.
 *
 * The animation is decoration on top of a number that is already correct: the
 * final frame is always the exact value passed in, and anyone who has asked
 * their system to reduce motion simply sees that value immediately.
 */
export function CountUp({ value, from = 0, className }: CountUpProps) {
    const [shown, setShown] = useState(value);
    const previous = useRef(from);
    const frame = useRef<number>(0);

    useEffect(() => {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const start = previous.current;

        const settle = () => {
            previous.current = value;
            setShown(value);
        };

        /*
         * No animation when it would not be seen anyway - and, more to the
         * point, browsers stop serving animation frames to a hidden tab, so
         * tweening there would leave the previous figure frozen on screen.
         */
        if (reduceMotion || document.hidden || start === value) {
            settle();

            return;
        }

        const startedAt = performance.now();

        const step = (now: number) => {
            const progress = Math.min(1, (now - startedAt) / DURATION);

            setShown(Math.round(start + (value - start) * easeOut(progress)));

            if (progress < 1) {
                frame.current = requestAnimationFrame(step);

                return;
            }

            // Land exactly on the value: rounding during the tween must never
            // be what the reader is left looking at.
            settle();
        };

        frame.current = requestAnimationFrame(step);

        /*
         * Backstop. If the frames stop arriving - the tab is hidden partway
         * through, the machine stalls - the correct figure still has to be what
         * is on screen. A wrong number on a pricing table is worse than a
         * missing animation.
         */
        const guard = window.setTimeout(settle, DURATION + 150);

        return () => {
            cancelAnimationFrame(frame.current);
            window.clearTimeout(guard);
        };
    }, [value]);

    return (
        <span className={className} aria-label={rupiah(value)}>
            <span aria-hidden="true">{rupiah(shown)}</span>
        </span>
    );
}
