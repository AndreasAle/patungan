import AppearanceTabs from '@/components/appearance-tabs';
import SettingsLayout, { SettingsCard } from '@/layouts/settings/layout';
import { Head } from '@inertiajs/react';

export default function Appearance() {
    return (
        <SettingsLayout title="Tampilan" description="Pilih tema yang paling enak di mata kamu.">
            <Head title="Tampilan" />

            <SettingsCard title="Tema aplikasi" description="Ikut pengaturan HP kamu, atau kunci ke terang / gelap.">
                <AppearanceTabs />
            </SettingsCard>
        </SettingsLayout>
    );
}
