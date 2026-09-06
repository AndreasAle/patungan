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
php artisan test        # 76 test
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
| `patungans` | Judul, kategori, jenis pembagian, status, token publik, batas waktu bayar, agregat ter-cache |
| `patungan_participants` | Nama, tagihan, jumlah dibayar, status, UUID sendiri (nama tidak pernah jadi identifier) |
| `payments` | Nominal, fee gateway/platform, net, referensi gateway, status, QR, kedaluwarsa |
| `wallet_ledgers` | Setiap pergerakan uang, unik per `(type, reference)` |
| `payout_destinations` | Rekening/e-wallet tujuan, nomor tidak pernah dikirim ke browser |
| `settlements` | Permintaan pencairan, provider, status, alasan gagal |
| `webhook_logs` | Payload tersanitasi, validitas signature, hasil pemrosesan |
| `analytics_events` | Event produk internal, tanpa IP mentah |

Semua uang disimpan sebagai integer rupiah (`BIGINT`) — tidak ada float.

## Batas waktu pembayaran

Organizer menentukan sampai kapan link menerima pembayaran (preset 24 jam / 3
hari / 7 hari, atau tanggal-jam sendiri, atau tanpa batas). Setelah lewat:

- tombol Bayar mati dan halaman publik menampilkan "Batas waktu pembayaran sudah lewat"
- server menolak pembuatan invoice baru
- masa berlaku QRIS tidak pernah melewati batas waktu patungan

Batas waktu bisa diperpanjang atau dihapus lagi dari halaman ubah patungan.

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
resources/js/pages/public/     Halaman share link & pembayaran QRIS
resources/js/pages/admin/      Panel admin
```
