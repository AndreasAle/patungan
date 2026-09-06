import PatunganLayout from '@/layouts/patungan-layout';
import type { ReactNode } from 'react';

/** Kept so the starter-kit settings pages share the Patungan chrome. */
export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
    return <PatunganLayout title={title ?? 'Pengaturan'}>{children}</PatunganLayout>;
}
