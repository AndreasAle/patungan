import { LegalPage, Notice, Points, Section } from '@/components/legal/legal-page';
import { rupiah } from '@/lib/format';

interface Props {
    updated: string;
    fee: { service_fee: number; example_amount: number; example_charged: number };
    payout: { minimum: number };
    invoice_minutes: number;
}

/**
 * The terms, written against what the code actually does.
 *
 * The fee figures are passed in from the same calculator that prices real
 * invoices, so this page cannot drift from what a payer is charged. Quoting a
 * hardcoded percentage here would be the kind of mistake nobody notices until
 * somebody compares it with their receipt.
 */
export default function Terms({ updated, fee, payout, invoice_minutes }: Props) {
    return (
        <LegalPage title="Syarat & Ketentuan" updated={updated}>
            <Section heading="Ringkasnya">
                <p>
                    Patungan adalah alat untuk membagi tagihan dalam kelompok. Penyelenggara membuat link, peserta membayar bagiannya lewat QRIS, lalu
                    dananya diteruskan ke penyelenggara setelah dipotong biaya layanan. Kami bukan bank, bukan pemberi pinjaman, dan bukan pihak dalam
                    kesepakatan antara kamu dan teman-temanmu.
                </p>
            </Section>

            <Section heading="1. Siapa yang bertanggung jawab atas apa">
                <p>
                    <strong className="text-foreground">Penyelenggara</strong> bertanggung jawab penuh atas isi patungannya: nama yang dimasukkan,
                    nominal yang ditagihkan, dan apakah barang atau jasanya benar-benar terwujud. Patungan tidak memverifikasi alasan kamu menagih.
                </p>
                <p>
                    <strong className="text-foreground">Peserta</strong> bertanggung jawab memastikan tagihan yang dibayar memang miliknya. Pastikan
                    nama dan nominalnya cocok sebelum membayar.
                </p>
                <Notice>
                    Kalau penyelenggara tidak menepati janjinya, penyelesaiannya antara kamu dan dia. Patungan tidak menjadi penengah sengketa dan
                    tidak menjamin barang atau jasa apa pun terwujud.
                </Notice>
            </Section>

            <Section heading="2. Biaya layanan">
                <p>
                    Pembayaran dikenakan biaya layanan yang sudah termasuk biaya pemrosesan. Biaya ini{' '}
                    <strong className="text-foreground">ditanggung pembayar</strong>, dan selalu ditampilkan sebelum pembayaran dibuat.
                </p>
                <p>
                    Contoh: tagihan {rupiah(fee.example_amount)} akan ditagihkan {rupiah(fee.example_charged)} kepada pembayar, dan penyelenggara
                    menerima {rupiah(fee.example_amount)} secara utuh.
                </p>
                <p>
                    Angka di atas dihitung dengan kalkulator yang sama dengan yang memberi harga tagihan sungguhan, jadi halaman ini tidak bisa
                    berbeda dari yang kamu lihat saat membayar.
                </p>
            </Section>

            <Section heading="3. Pembayaran">
                <Points
                    items={[
                        `Kode QRIS berlaku sekitar ${invoice_minutes} menit. Setelah lewat, kamu bisa membuat kode baru.`,
                        'Pembayaran dianggap sah hanya setelah dikonfirmasi oleh penyedia pembayaran. Tangkapan layar dari aplikasi dompet digital bukan bukti yang kami akui secara otomatis.',
                        'Kalau uang sudah terpotong tapi status belum berubah dalam beberapa menit, hubungi kami lewat tombol bantuan.',
                    ]}
                />
            </Section>

            <Section heading="4. Pencairan">
                <p>
                    Saldo yang sudah masuk dapat dicairkan ke rekening yang kamu daftarkan, minimal {rupiah(payout.minimum)}. Pencairan diverifikasi
                    sebelum ditransfer. Saldo dipotong saat kamu mengajukan, dan dikembalikan otomatis apabila transfer gagal.
                </p>
                <p>Rekening tujuan harus atas namamu sendiri. Kami dapat menolak pencairan ke rekening pihak lain.</p>
            </Section>

            <Section heading="5. Pengembalian dana">
                <p>
                    Patungan tidak memproses pengembalian dana secara otomatis. Kalau peserta perlu dikembalikan uangnya, penyelenggara yang
                    mengurusnya langsung dengan peserta tersebut.
                </p>
            </Section>

            <Section heading="6. Yang tidak boleh dikumpulkan">
                <p>Kamu dilarang memakai Patungan untuk mengumpulkan dana yang berkaitan dengan:</p>
                <Points
                    items={[
                        'Perjudian, undian berhadiah, atau taruhan dalam bentuk apa pun.',
                        'Barang atau jasa yang dilarang hukum Indonesia.',
                        'Penipuan, penggalangan dana fiktif, atau menagih orang yang tidak pernah setuju ikut.',
                        'Investasi, pinjaman berbunga, arisan berantai, atau skema yang menjanjikan keuntungan.',
                        'Pencucian uang atau pendanaan kegiatan terlarang.',
                    ]}
                />
                <p>
                    Kami dapat menutup patungan, membekukan saldo, dan menonaktifkan akun apabila menemukan pelanggaran — termasuk melaporkannya
                    kepada pihak berwenang bila diperlukan.
                </p>
            </Section>

            <Section heading="7. Akun">
                <p>
                    Jaga kerahasiaan kata sandimu. Aktivitas yang terjadi lewat akunmu menjadi tanggung jawabmu. Beri tahu kami segera kalau kamu
                    menduga akunmu diakses orang lain.
                </p>
                <p>Satu orang satu akun. Akun tidak boleh diperjualbelikan atau dipindahtangankan.</p>
            </Section>

            <Section heading="8. Ketersediaan layanan">
                <p>
                    Kami berusaha menjaga layanan tetap berjalan, tetapi tidak menjanjikan layanan bebas gangguan. Pemeliharaan, gangguan penyedia
                    pembayaran, atau masalah jaringan dapat membuat pembayaran tertunda.
                </p>
            </Section>

            <Section heading="9. Batas tanggung jawab">
                <p>
                    Sejauh diizinkan hukum, tanggung jawab Patungan terbatas pada biaya layanan yang kamu bayarkan untuk transaksi yang bersangkutan.
                    Kami tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan, atau kerugian yang timbul dari kesepakatan
                    antara penyelenggara dan pesertanya.
                </p>
            </Section>

            <Section heading="10. Perubahan syarat">
                <p>
                    Syarat ini dapat berubah. Tanggal di atas menunjukkan versi terakhir. Dengan terus memakai Patungan setelah perubahan, kamu
                    dianggap menyetujui versi yang berlaku.
                </p>
            </Section>

            <Section heading="11. Hukum yang berlaku">
                <p>Syarat ini tunduk pada hukum Republik Indonesia.</p>
            </Section>
        </LegalPage>
    );
}
