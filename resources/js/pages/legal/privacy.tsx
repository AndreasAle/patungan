import { LegalPage, Notice, Points, Section } from '@/components/legal/legal-page';

/**
 * What Patungan actually collects, written from the schema rather than from a
 * template.
 *
 * Every claim here is checkable against the code: the columns that exist, the
 * ones deliberately left out, and the two places where the application chose
 * less data than it could have had. A privacy policy that describes a different
 * product than the one running is worse than none - it is a promise nobody
 * kept.
 */
export default function Privacy({ updated }: { updated: string }) {
    return (
        <LegalPage title="Kebijakan Privasi" updated={updated}>
            <Section heading="Ringkasnya">
                <p>
                    Patungan mengumpulkan sesedikit mungkin. Kami tidak menyimpan alamat IP mentah, tidak menyimpan nomor kartu, dan tidak menjual
                    data siapa pun ke siapa pun. Halaman ini menjelaskan persis apa yang disimpan dan kenapa.
                </p>
            </Section>

            <Section heading="1. Data penyelenggara (yang punya akun)">
                <p>Kalau kamu membuat akun untuk menyelenggarakan patungan, kami menyimpan:</p>
                <Points
                    items={[
                        'Nama dan alamat email kamu.',
                        'Kata sandi, disimpan dalam bentuk hash - kami tidak bisa membacanya, dan tidak ada seorang pun di Patungan yang bisa.',
                        'Kalau kamu masuk lewat Google: nama, email, dan pengenal akun Google kamu. Kami tidak pernah menerima kata sandi Google kamu.',
                        'Rekening tujuan pencairan. Nomor rekeningnya dienkripsi di database, bukan disimpan apa adanya.',
                        'Riwayat patungan, pembayaran yang masuk, dan pencairan yang kamu minta.',
                    ]}
                />
            </Section>

            <Section heading="2. Data peserta (yang cuma bayar)">
                <p>
                    Peserta tidak perlu punya akun dan tidak kami minta mendaftar. Yang tersimpan hanyalah yang dimasukkan penyelenggara dan yang
                    dibutuhkan agar pembayaran bisa dicocokkan:
                </p>
                <Points
                    items={[
                        'Nama yang diketik penyelenggara. Bukan kami yang meminta, dan kami tidak memverifikasinya.',
                        'Jumlah tagihan dan status pembayaran.',
                        'Catatan opsional yang ditulis penyelenggara.',
                    ]}
                />
                <p>Kami tidak meminta nomor telepon, alamat, tanggal lahir, atau nomor identitas peserta. Tidak ada kolomnya di database kami.</p>
            </Section>

            <Section heading="3. Data pembayaran">
                <p>
                    Pembayaran QRIS diproses oleh penyedia jasa pembayaran berizin Bank Indonesia. Uangnya melewati sistem mereka, bukan sistem kami.
                </p>
                <p>
                    Kami menyimpan nomor referensi transaksi, jumlah, status, dan waktu - secukupnya untuk mencocokkan pembayaran dengan tagihan dan
                    menjawab kalau ada sengketa. <strong className="text-foreground">Kami tidak pernah menerima atau menyimpan</strong> nomor kartu,
                    PIN, saldo dompet digital, atau kredensial akun pembayaran kamu.
                </p>
            </Section>

            <Section heading="4. Lokasi pembayar">
                <p>
                    Kami menyimpan satu keterangan lokasi yang sangat kasar: <strong className="text-foreground">zona waktu</strong> perangkat yang
                    dipakai membayar — WIB, WITA, WIT, atau luar Indonesia. Itu dipakai untuk menampilkan asal pembayaran ke penyelenggara.
                </p>
                <p>
                    Empat kemungkinan nilai untuk seluruh Indonesia. Tidak bisa menunjuk kota, apalagi orang. Kami tidak memakai GPS, tidak meminta
                    izin lokasi, dan tidak melakukan pelacakan IP ke alamat.
                </p>
            </Section>

            <Section heading="5. Analitik">
                <p>
                    Kami mencatat peristiwa produk sendiri — patungan dibuat, link dibagikan, pembayaran dimulai — untuk tahu bagian mana yang
                    dipakai. Tidak ada pelacak pihak ketiga, tidak ada Google Analytics, tidak ada pixel iklan.
                </p>
                <Points
                    items={[
                        'Pengunjung dicatat sebagai kunci ter-hash, bukan alamat IP. Hash-nya tidak bisa dibalik menjadi alamat aslinya.',
                        'Isi pesan WhatsApp yang kamu buat tidak pernah dikirim ke analitik kami - hanya jenisnya, bukan teksnya.',
                        'Nominal tagihan tidak pernah dikirim ke analitik.',
                    ]}
                />
            </Section>

            <Section heading="6. Pesan bantuan">
                <p>
                    Kalau kamu mengirim pesan lewat tombol bantuan, kami menyimpan nama, kontak, isi pesan, dan halaman tempat kamu mengirimnya —
                    supaya kami bisa membalas dan memahami konteksnya. Hanya admin Patungan yang bisa membacanya.
                </p>
            </Section>

            <Section heading="7. Siapa yang bisa melihat apa">
                <Points
                    items={[
                        'Penyelenggara melihat daftar peserta patungannya sendiri beserta status bayarnya.',
                        'Peserta yang membuka link grup melihat nama peserta lain dan status bayarnya - ini memang tujuan link grup. Penyelenggara bisa menyamarkan nama lewat pengaturan privasi.',
                        'Peserta yang membuka link personal hanya melihat tagihannya sendiri. Nama peserta lain tidak ikut terkirim ke halaman itu.',
                        'Admin Patungan dapat melihat data yang diperlukan untuk dukungan teknis dan penyelesaian sengketa.',
                    ]}
                />
                <Notice>
                    Link patungan bersifat rahasia karena tokennya acak, bukan karena dilindungi kata sandi. Siapa pun yang memegang link itu bisa
                    membukanya. Bagikan hanya ke grup yang kamu maksud.
                </Notice>
            </Section>

            <Section heading="8. Berbagi dengan pihak lain">
                <p>Kami membagikan data hanya kepada:</p>
                <Points
                    items={[
                        'Penyedia jasa pembayaran, sebatas yang dibutuhkan untuk memproses transaksi.',
                        'Penyedia layanan email, untuk mengirim verifikasi dan notifikasi.',
                        'Penyedia hosting yang menjalankan aplikasi ini.',
                        'Otoritas yang berwenang, apabila diwajibkan hukum yang berlaku.',
                    ]}
                />
                <p>Kami tidak menjual data pribadi, dan tidak membagikannya untuk keperluan iklan.</p>
            </Section>

            <Section heading="9. Berapa lama disimpan">
                <p>
                    Catatan transaksi disimpan selama diwajibkan untuk keperluan pembukuan dan penyelesaian sengketa. Data akun disimpan selama akunmu
                    aktif. Kamu bisa meminta penghapusan akun lewat kontak di bawah — catatan keuangan yang wajib disimpan menurut hukum akan
                    dipertahankan meski akunmu dihapus.
                </p>
            </Section>

            <Section heading="10. Hak kamu">
                <p>
                    Kamu berhak meminta salinan data kamu, meminta perbaikan kalau ada yang keliru, dan meminta penghapusan. Kirim permintaan lewat
                    email di bawah dari alamat yang terdaftar di akunmu.
                </p>
            </Section>

            <Section heading="11. Perubahan">
                <p>
                    Kalau kebijakan ini berubah, tanggal di atas ikut berubah. Perubahan yang berdampak besar akan kami beri tahu lewat email ke
                    penyelenggara terdaftar.
                </p>
            </Section>
        </LegalPage>
    );
}
