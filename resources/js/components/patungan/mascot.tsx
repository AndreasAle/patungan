import { cn } from '@/lib/utils';

export type MascotMood = 'happy' | 'cheer' | 'thinking' | 'sleepy';

/**
 * Tuni, the Patungan mascot.
 *
 * Built from the brand mark rather than drawn beside it: the deep bowl and the
 * lime leaf are the same two shapes as the logo, so the character reads as the
 * product rather than as a sticker somebody added to it.
 *
 * Four moods, and each one is tied to a real state on the screen it appears on
 * - everything paid, money waiting, nobody has started. A mascot that is always
 * delighted stops carrying information and becomes decoration, which on a page
 * about money is worse than none.
 *
 * Every motion here is CSS and every one of them stops under
 * prefers-reduced-motion. A page about somebody's balance must not move for a
 * person who has asked screens to hold still.
 */
export function Mascot({ mood = 'happy', className }: { mood?: MascotMood; className?: string }) {
    return (
        <svg
            viewBox="0 0 120 120"
            className={cn('mascot', `mascot-${mood}`, className)}
            role="img"
            aria-label="Maskot Patungan"
            xmlns="http://www.w3.org/2000/svg"
        >
            {/* Shadow, so the character sits on something. */}
            <ellipse className="mascot-shadow" cx="60" cy="108" rx="26" ry="5" fill="#0B3828" opacity="0.16" />

            <g className="mascot-body">
                {/*
                    One rounded body, not two overlapping logo shapes.
                    
                    The mark's deliberate square corner works at 24px as a
                    logo and reads as a cut-off rectangle at 120px as a face.
                    The colours and the leaf stay; the geometry becomes a
                    creature.
                */}
                <path d="M60 16c19 0 32 15 32 34v17c0 19-14 33-32 33s-32-14-32-33V50c0-19 13-34 32-34Z" fill="#15563A" />

                {/* Leaf sprout, the one piece kept literally from the mark. */}
                <path d="M78 20c8-4 16-3 20 1-2 6-8 11-15 11-4 0-7-1-9-3 1-4 2-7 4-9Z" fill="#A6D93B" />
                <path d="M74 30c6-5 14-8 20-8" stroke="#15563A" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />

                {/*
                    Lime belly, kept low and small on purpose. Any larger and
                    its top edge meets the smile, and the whole thing reads as
                    one enormous open mouth rather than a face above a belly.
                */}
                <ellipse cx="60" cy="87" rx="16" ry="11" fill="#A6D93B" />

                <g className="mascot-face">
                    <circle className="mascot-eye" cx="50" cy="52" r="4" fill="#123A28" />
                    <circle className="mascot-eye" cx="70" cy="52" r="4" fill="#123A28" />

                    {mood === 'sleepy' ? (
                        <path d="M45 52h10M65 52h10" stroke="#123A28" strokeWidth="3" strokeLinecap="round" fill="none" />
                    ) : (
                        <path
                            d={mood === 'cheer' ? 'M50 60a10 10 0 0 0 20 0Z' : 'M51 60a9 9 0 0 0 18 0'}
                            fill={mood === 'cheer' ? '#123A28' : 'none'}
                            stroke="#123A28"
                            strokeWidth="3"
                            strokeLinecap="round"
                        />
                    )}

                    {/* Blush, only when pleased. */}
                    {(mood === 'happy' || mood === 'cheer') && (
                        <>
                            <ellipse cx="38" cy="59" rx="4.5" ry="3" fill="#F07A5A" opacity="0.4" />
                            <ellipse cx="82" cy="59" rx="4.5" ry="3" fill="#F07A5A" opacity="0.4" />
                        </>
                    )}
                </g>
            </g>

            {/* Coins tossed when celebrating; three dots while thinking. */}
            {mood === 'cheer' && (
                <g className="mascot-coins">
                    <circle cx="100" cy="40" r="7" fill="#F5C542" />
                    <circle cx="18" cy="44" r="5" fill="#F5C542" />
                    <circle cx="106" cy="70" r="4" fill="#A6D93B" />
                </g>
            )}

            {mood === 'thinking' && (
                <g className="mascot-think">
                    <circle cx="98" cy="48" r="3" fill="#A6D93B" />
                    <circle cx="106" cy="38" r="4" fill="#A6D93B" />
                    <circle cx="114" cy="26" r="5" fill="#A6D93B" />
                </g>
            )}

            {mood === 'sleepy' && (
                <g className="mascot-zzz" fill="#A6D93B" fontSize="13" fontWeight="800">
                    <text x="96" y="46">
                        z
                    </text>
                    <text x="106" y="32">
                        Z
                    </text>
                </g>
            )}
        </svg>
    );
}
