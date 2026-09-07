import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark' | 'system';

/*
 * What someone sees before they have expressed a preference.
 *
 * Light, not "system": Patungan is a money product and the light palette is
 * the one every screen was designed and reviewed against. Following the
 * operating system meant anyone on a dark desktop met a dark app they never
 * asked for. "System" is still there for people who choose it in Settings.
 */
const DEFAULT_APPEARANCE: Appearance = 'light';

const prefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

const applyTheme = (appearance: Appearance) => {
    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark());

    document.documentElement.classList.toggle('dark', isDark);
};

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

const handleSystemThemeChange = () => {
    const currentAppearance = localStorage.getItem('appearance') as Appearance;
    applyTheme(currentAppearance || DEFAULT_APPEARANCE);
};

export function initializeTheme() {
    const savedAppearance = (localStorage.getItem('appearance') as Appearance) || DEFAULT_APPEARANCE;

    applyTheme(savedAppearance);

    // Add the event listener for system theme changes...
    mediaQuery.addEventListener('change', handleSystemThemeChange);
}

export function useAppearance() {
    const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);

    const updateAppearance = (mode: Appearance) => {
        setAppearance(mode);
        localStorage.setItem('appearance', mode);
        applyTheme(mode);
    };

    useEffect(() => {
        const savedAppearance = localStorage.getItem('appearance') as Appearance | null;
        updateAppearance(savedAppearance || DEFAULT_APPEARANCE);

        return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }, []);

    return { appearance, updateAppearance };
}
