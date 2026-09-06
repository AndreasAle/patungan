# Patungan

Kumpulin uang patungan lewat satu link. Organizer bikin patungan, share ke grup,
teman-teman buka link, pilih namanya, bayar QRIS. Tanpa daftar, tanpa login,
tanpa cek transfer satu-satu.

**Create → Share → Pilih nama → Bayar → Beres.**

---

## Stack

| Bagian | Teknologi |
| --- | --- |
| Backend | Laravel 12, PHP 8.2+ |
| Frontend | Inertia.js 2 + React 19 + TypeScript, Tailwind CSS 4 |
| Database | MySQL 8 / MariaDB 10.4+ |
| Queue | Database queue (bisa ditukar Redis) |
| Payment | Midtrans Core API (QRIS dinamis), di balik `PaymentGateway` interface |
| Payout | `PayoutProvider` interface, driver bawaan `manual` (admin-assisted) |

## Menjalankan secara lokal

```bash
composer install && npm install
cp .env.example .env && php artisan key:generate
```

Buat database, lalu isi `.env`:

```
DB_CONNECTION=mysql
DB_DATABASE=patungan
PAYMENT_GATEWAY=sandbox
```

```bash
php artisan migrate --seed
npm run dev
php artisan serve
```

Akun demo (password `password`):

- Organizer — `andreas@patungan.test`
- Admin — `admin@patungan.test`

Seed membuat "Badminton Minggu Malam", 8 peserta @ Rp25.000, 5 di antaranya sudah
bayar lewat invoice sungguhan sehingga saldo dan ledger konsisten.

## Menguji alur pembayaran

Dengan `PAYMENT_GATEWAY=sandbox` (hanya `local`/`testing`) tidak ada panggilan
jaringan. Buka link publik, pilih nama, tekan Bayar, lalu kirim notifikasi
bertanda tangan seperti yang dikirim provider:

```bash
curl -X POST http://localhost:8000/dev/sandbox/{payment-uuid}/pay -H "Content-Type: application/json" -d "{\"outcome\":\"settlement\"}"
```

`outcome` menerima `settlement`, `expire`, atau `deny`. Notifikasi ini lewat
jalur webhook yang sama persis dengan produksi — termasuk verifikasi signature
dan idempotency.

### Memakai Midtrans sungguhan

```
PAYMENT_GATEWAY=midtrans
MIDTRANS_SERVER_KEY=...
MIDTRANS_PRODUCTION=false
```

Arahkan Payment Notification URL Midtrans ke:

```
POST /webhooks/payments/midtrans
```

Driver `sandbox` menolak dijalankan di luar `local`/`testing`.

## Perintah

```bash
php artisan test        # 110 test
php artisan payments:expire   # dijadwalkan tiap menit
npm run build
./vendor/bin/pint
```

## Alur pembayaran

```
Peserta pilih nama
  → server baca nominal DARI DATABASE (bukan dari request)
  → FeeCalculator hitung fee (integer rupiah)
  → baris payment PENDING dibuat, mengunci slot invoice peserta
  → gateway buat charge QRIS
  → peserta scan QR
  → provider kirim webhook → signature diverifikasi → nominal dicocokkan
  → dalam satu transaksi: payment PAID, peserta PAID, ledger ditulis,
    agregat patungan dihitung ulang, patungan jadi COMPLETED bila lunas
  → halaman publik polling status dan berubah sendiri
```

Frontend tidak pernah menentukan nominal, dan status sukses selalu berasal dari
record payment — bukan dari query string.

## Struktur database

| Tabel | Isi |
| --- | --- |
| `patungans` | Judul, kategori, jenis pembagian, status, token publik, mode privasi, batas waktu bayar, agregat ter-cache |
| `patungan_participants` | Nama, tagihan, jumlah dibayar, status, nomor invoice, PIN room terenkripsi, UUID sendiri (nama tidak pernah jadi identifier) |
| `payments` | Nominal, fee gateway/platform, net, referensi gateway, status, QR, kedaluwarsa |
| `wallet_ledgers` | Setiap pergerakan uang, unik per `(type, reference)` |
| `payout_destinations` | Rekening/e-wallet tujuan, nomor tidak pernah dikirim ke browser |
| `settlements` | Permintaan pencairan, provider, status, alasan gagal |
| `webhook_logs` | Payload tersanitasi, validitas signature, hasil pemrosesan |
| `analytics_events` | Event produk internal, tanpa IP mentah |

Semua uang disimpan sebagai integer rupiah (`BIGINT`) — tidak ada float.

## Invoice per peserta

Begitu bagian seseorang lunas — lewat QRIS maupun dicatat manual oleh
organizer — sistem menerbitkan nomor invoice (`INV-260906-AB12C`) dan tombol
**Invoice** muncul di sebelah namanya, baik di halaman publik maupun di halaman
organizer.

Halaman invoice berisi nomor, tanggal, nominal, metode, penyelenggara, QR untuk
membuka/mengecek bukti itu sendiri, tombol bagikan, dan simpan PDF (lewat print
stylesheet, tanpa library tambahan).

Invoice memakai nomor sendiri, bukan referensi payment gateway — jadi bukti
bayar aman dibagikan ke grup tanpa membocorkan internal provider. Membatalkan
tanda bayar manual otomatis membatalkan invoice-nya.

## Tempel daftar nama dari chat

Organizer tidak perlu mengetik satu per satu. Copy line-up dari grup, tempel,
dan sistem membaca namanya sendiri:

```
Beta Minisoccer 1 September 2026     -> dibuang (judul)
20.00-22.00                          -> dibuang (jam)
Tim A (baju ijo)                     -> dibuang (judul tim)
1. ando                              -> ando
4. fafa (kiper)                      -> fafa, catatan "kiper"
```

Kalau teksnya memakai penomoran atau bullet, hanya baris itu yang diambil.
Kalau tidak ada penomoran sama sekali, tiap baris dihitung satu nama. Hasil
bacaan ditampilkan sebagai chip yang bisa dibatalkan satu-satu sebelum
ditambahkan, jadi judul yang lolos tidak pernah jadi peserta yang ditagih.

## Private room (mode vendor)

Buat kasus EO: satu event, banyak vendor, dan vendor lighting tidak boleh tahu
nominal vendor sound. Saat membuat patungan, pilih **Private room** sebagai ganti
link terbuka.

Yang berubah:

- Tiap peserta dapat PIN 6 digit unik yang dibuat sistem
- Linknya tetap satu untuk semua, tapi halaman publiknya terkunci: pengunjung
  harus memasukkan PIN dulu
- Setelah terbuka, vendor **hanya** melihat tagihannya sendiri. Daftar peserta,
  total terkumpul, target, dan jumlah peserta tidak pernah dikirim ke browser —
  bukan disembunyikan lewat CSS, tapi memang tidak ada di payload
- Di halaman organizer, tiap peserta punya tombol **Salin undangan** yang
  menyalin pesan lengkap: sapaan, nominal, link, dan PIN orang itu, siap
  ditempel ke chat. PIN-nya sendiri tersembunyi sampai ditekan tombol mata

Aturan aksesnya:

- PIN disimpan terenkripsi, bukan plaintext, plus hash berkunci untuk pencarian
  dan untuk menjamin tidak ada dua peserta ber-PIN sama dalam satu room
- Percobaan PIN dibatasi 8 kali per menit per IP
- Sesi yang terbuka hanya mengizinkan aksi untuk peserta itu: membuat
  pembayaran atau membuka invoice milik vendor lain menghasilkan 403

## Batas waktu pembayaran

Organizer menentukan sampai kapan link menerima pembayaran (preset 24 jam / 3
hari / 7 hari, atau tanggal-jam sendiri, atau tanpa batas). Setelah lewat:

- tombol Bayar mati dan halaman publik menampilkan "Batas waktu pembayaran sudah lewat"
- server menolak pembuatan invoice baru
- masa berlaku QRIS tidak pernah melewati batas waktu patungan

Batas waktu bisa diperpanjang atau dihapus lagi dari halaman ubah patungan.

## Desain

Hijau tua sebagai permukaan "uang" (saldo, ringkasan patungan, header invoice,
profil), mint sebagai latar, dan satu aksen lime khusus untuk progress dan aksi
utama. Panel hijau memakai gradien plus bloom lime tipis biar tidak kaku seperti
blok bank.

Mobile-first: semua ukuran teks dan tinggi kontrol dipatok untuk layar 375px
dulu, baru membesar di `sm`/`lg`. Ikon memakai satu set Lucide; emoji hanya
dipakai di copy, bukan sebagai ikon aplikasi. Logo Patungan (dua daun membentuk
huruf P) hidup sebagai SVG di `app-logo-icon.tsx` dan `public/favicon.svg`.

Halaman `/profil` adalah beranda akun: avatar inisial, statistik patungan,
kartu saldo mengambang, lalu daftar menu untuk uang dan akun. Seluruh copy
aplikasi berbahasa Indonesia — termasuk halaman auth dan pengaturan bawaan.

## Login dengan Google

Fondasinya sudah terpasang lewat Laravel Socialite; tinggal isi kredensial:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
```

Di Google Cloud Console, daftarkan redirect URI `/auth/google/callback`.

Selama kredensial masih kosong, `GoogleAuthController::enabled()` bernilai
false: rutenya membalas 404 dan tombolnya tidak dirender sama sekali, jadi tidak
ada jalan buntu buat pengguna.

Cara akun dipetakan:

- Ketemu `google_id` yang sama → pakai akun itu
- Belum ada, tapi emailnya sudah terdaftar → akunnya di-link, bukan diduplikasi,
  dan password lamanya tetap berfungsi
- Belum ada sama sekali → akun baru dibuat tanpa password, email langsung
  dianggap terverifikasi karena Google sudah memverifikasinya

Akun yang hanya punya Google tidak bisa ditembus lewat form password: kolom
`password` boleh null dan `getAuthPassword()` mengembalikan string kosong,
sehingga tidak pernah cocok dengan apa pun.

## Popup sambutan

`WelcomeDialog` muncul sekali untuk gelombang pengguna pertama. "Jangan
tampilkan lagi" disimpan di `localStorage` browser itu, "Tutup" hanya
menyembunyikan untuk sesi berjalan. Naikkan `STORAGE_KEY` kalau pesannya
diganti, biar pengguna lama melihat versi baru.

Foto developer opsional: simpan sebagai `public/images/founder.png`. Kalau
filenya tidak ada, popup tetap tampil rapi tanpa ruang kosong. Untuk memotong
background dari foto studio:

```bash
python scripts/cutout-photo.py <foto-asli> public/images/founder.png
```

## Keamanan

- Nominal selalu dibaca dari database; input nominal dari klien diabaikan
- Signature webhook diverifikasi sebelum apa pun dipercaya, nominal dicocokkan dengan invoice
- Webhook idempoten: unique `(gateway, gateway_transaction_id)`, unique `(type, reference)` di ledger, row locking, dan semua perubahan uang dalam satu DB transaction
- Satu peserta hanya bisa punya satu invoice aktif — dijamin unique index `payments.active_participant_id`
- Link publik memakai token acak, bukan ID berurutan; entity internal punya UUID
- Policy per-organizer mencegah IDOR; admin di balik middleware terpisah
- Rate limiting pada pembuatan pembayaran, polling status, dan webhook
- Payload publik dibentuk presenter khusus: tidak ada email organizer, nomor rekening penuh, referensi gateway, atau respons mentah provider
- Log webhook disanitasi dari kredensial; nomor rekening di-mask (`BCA ******8291`)
- CSRF aktif di semua form; hanya endpoint webhook yang dikecualikan
- Kredensial hanya dari environment variable

## Pencairan (settlement)

Ledger adalah catatan internal platform, **bukan** klaim bahwa aplikasi ini
adalah stored-value wallet berlisensi.

Driver payout bawaan adalah `manual`: permintaan pencairan masuk antrean, saldo
langsung didebit ke ledger, lalu operator memproses transfer dan menandainya di
admin panel. Kalau gagal, dananya dikembalikan otomatis ke ledger. Tidak ada
yang berpura-pura otomatis.

Begitu provider disbursement tersedia (Midtrans Iris, Xendit, Flip), cukup
tambah satu kelas yang mengimplementasikan `PayoutProvider` — bagian lain
aplikasi tidak perlu berubah.

## Modul utama

```
app/Enums/                     Status & tipe domain
app/Contracts/                 PaymentGateway, PayoutProvider
app/Payments/Gateways/         MidtransGateway, SandboxGateway
app/Payments/Payouts/          ManualPayoutProvider
app/Services/                  Patungan, Participant, Payment, Ledger,
                               Settlement, Fee, WebhookProcessor, Analytics
app/Support/PatunganPresenter  Bentuk payload publik vs organizer
resources/js/lib/parse-names   Pembaca daftar nama dari chat
resources/js/pages/public/     Halaman share link, pembayaran QRIS & invoice
resources/js/pages/admin/      Panel admin
```
