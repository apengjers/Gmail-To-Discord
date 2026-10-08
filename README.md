# Gmail Forwarder

Manual instalasi dan konfigurasi untuk project Gmail Forwarder.

## Deskripsi
Project ini membaca email dari akun IMAP (misalnya Gmail) lalu meneruskan email yang cocok dengan filter tertentu ke Discord webhook.

## Prasyarat
- Node.js (Direkomendasikan versi LTS)
- npm
- Akses IMAP ke akun email
- Discord webhook untuk masing-masing filter

## Instalasi Manual (Windows / Linux)
1. Clone repository:
   ```bash
   pkg install git
   git clone https://your-repo-url.git
   cd gmailforwarder
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Buat file `.env` di root project.
4. Isi file `.env` sesuai konfigurasi akun Anda.
5. Jalankan bot:
   ```bash
   node src/index.js
   ```

## Instalasi di Termux
1. Install Termux dari F-Droid atau sumber resmi.
2. Buka Termux dan jalankan:
   ```bash
   pkg update && pkg upgrade
   pkg install git nodejs-lts
   ```
3. Clone project:
   ```bash
   git clone https://your-repo-url.git
   cd gmailforwarder
   ```
4. Install dependensi:
   ```bash
   npm install
   ```
5. Buat file `.env` di root project dan isi dengan konfigurasi Anda.
6. Jalankan bot:
   ```bash
   node src/index.js
   ```

## Konfigurasi `.env`
Buat file `.env` di folder root (sama dengan `package.json`) dengan isi contoh berikut:

```env
EMAIL=alamat-email-anda@gmail.com
PASSWORD=password-atau-app-password-anda
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_SECURE=true

DISCORD_STOCK_WEBHOOK=https://discord.com/api/webhooks/...
DISCORD_ORDER_WEBHOOK=https://discord.com/api/webhooks/...
```

Nama variabel webhook di atas harus sama dengan yang dipakai di `src/config/filters.js`. Tambah filter berarti tambah variabel webhook baru di `.env`.

Catatan:
- Untuk akun Gmail, gunakan `App Password` jika autentikasi dua faktor diaktifkan.
- Pastikan IMAP sudah diaktifkan pada pengaturan akun email.
- Jangan upload file `.env` ke repositori karena berisi kredensial sensitif.

## Mengedit Filter
Filter dikelola di file `src/config/filters.js`.

Setiap item filter memiliki properti:
- `name`: nama filter
- `enabled`: status filter (tidak diproses secara otomatis oleh bot saat ini, namun dapat dipakai untuk dokumentasi)
- `sender`: daftar alamat pengirim atau kata kunci pengirim
- `subject`: daftar kata kunci subjek email
- `webhook`: URL Discord webhook dari `.env`

Contoh filter:

```js
module.exports = [
    {
        name: "Example 1",
        enabled: true,
        sender: ["sender1@gmail.com"],
        subject: ["Example Subject"],
        webhook: process.env.DISCORD_WEBHOOK1
    },
    {
        name: "Example 2",
        enabled: true,
        sender: ["sender2@gmail.com"],
        subject: ["Example Subject"],
        webhook: process.env.DISCORD_WEBHOOK2
    }
];
```

### Cara kerja filter
- `sender` dan `subject` dicocokkan secara case-insensitive.
- Email akan diteruskan jika nilai `from` dan `subject` keduanya cocok dengan filter.
- Hanya filter pertama yang cocok akan digunakan.

## Menjalankan

Setelah `.env` dan filter dikonfigurasi:

```bash
npm start
```

## Auto Guard

Bot ini dirancang agar tidak mati diam-diam, terutama di Termux.

### Lapisan 1: Guard di dalam Node (`npm start`)

| Mekanisme | Fungsi |
|---|---|
| `uncaughtException` + `unhandledRejection` | Tulis stack trace ke log, lalu `exit(1)` supaya proses di-restart bersih oleh supervisor. |
| Watchdog NOOP | Tiap 5 menit kirim `NOOP` dengan timeout 30 detik. Kalau gagal, koneksi dianggap mati dan dipaksa reconnect. Ini menangkap socket yang mati diam-diam (mis. ganti WiFi ke data). |
| Exponential backoff | Reconnect 5s, 10s, 20s, ... maksimal 5 menit. Reset ke 5s setelah berhasil connect. |
| Graceful shutdown | `SIGINT`/`SIGTERM` akan disconnect IMAP dengan rapi lalu keluar. |
| Gap guard | Kalau `lastUID` tertinggal > 200 UID, hanya 50 email terakhir yang diproses supaya tidak OOM. |
| Webhook retry | Maksimal 5 percobaan dengan backoff 2s/4s/8s/16s/32s, lalu skip email itu. Antrean tidak akan macet total. |

### Lapisan 2: Supervisor Termux (`npm run guard`)

Android bisa membunuh proses node kapan saja (low memory killer, battery saver, atau swipe away dari recent apps). Tidak ada kode Node yang bisa melawan itu, jadi `scripts/termux-run.sh` yang menghidupkan kembali prosesnya.

Fitur:
- `termux-wake-lock` supaya CPU tidak tidur.
- Loop restart otomatis bila node keluar.
- Crash brake: keluar 5x dalam 5 menit → tunggu 5 menit (biasanya artinya `.env` salah).
- PID file di `storage/logs/supervisor.pid`.
- Output node ditulis ke `storage/logs/supervisor.log`.

### Setup Termux

```bash
pkg update && pkg upgrade
pkg install nodejs-lts termux-api
npm install
```

Lalu jalankan di dalam `tmux` supaya tidak ikut mati saat terminal ditutup:

```bash
pkg install tmux
tmux new -s gmailforwarder
npm run guard
```

Detach: `Ctrl+B` lalu `D`. Reattach: `tmux attach -t gmailforwarder`.

### Supaya tidak dibunuh Android

1. Jalankan `termux-wake-lock` (sudah otomatis dipakai oleh supervisor).
2. Settings Android → Apps → Termux → Battery → **Unrestricted**.
3. Matikan "Remove from recents" untuk Termux, atau jangan swipe Termux dari recent apps.
4. Opsional, agar jalan lagi setelah HP restart, install **Termux:Boot** lalu buat `~/.termux/boot/start-gmailforwarder.sh`:
   ```bash
   #!/data/data/com.termux/files/usr/bin/bash
   cd ~/gmailforwarder
   termux-wake-lock
   bash scripts/termux-run.sh
   ```

### Membaca log

```bash
tail -f storage/logs/bot.log          # log utama (rotasi 5MB x 3)
tail -f storage/logs/supervisor.log   # log supervisor + output node
```

Kalau sering muncul `Watchdog heartbeat failed`, berarti koneksi sering putus. Naikkan timeout-nya lewat `.env`:

```env
WATCHDOG_INTERVAL=300000
WATCHDOG_TIMEOUT=60000
```

### Konfigurasi tambahan (opsional, lewat `.env`)

```env
RECONNECT_BASE_DELAY=5000
RECONNECT_MAX_DELAY=300000
MAX_UID_GAP=200
CATCHUP_COUNT=50
WEBHOOK_MAX_ATTEMPTS=5
WEBHOOK_BASE_DELAY=2000
LOG_LEVEL=info
```

## Troubleshooting

- **Sering mati sendiri** — pastikan dijalankan lewat `npm run guard`, bukan `node src/index.js` langsung. Dan pastikan battery Termux di-set ke Unrestricted.
- **Muncul `Backlog detected` di log** — `storage/state.json` tertinggal jauh. Bot sengaja hanya mengambil 50 email terakhir supaya tidak OOM. Kalau mau email lama ikut diproses, naikkan `MAX_UID_GAP`.
- **Proses restart terus-menerus** — cek `storage/logs/bot.log`. Kalau crash brake aktif, hampir pasti karena `.env` salah atau password app salah.
- **Jika gagal terkoneksi dengan IMAP**, periksa kembali `EMAIL`, `PASSWORD`, `IMAP_HOST`, `IMAP_PORT`, dan `IMAP_SECURE`.
- Pastikan akun email mendukung akses IMAP.
- Pastikan URL webhook Discord valid.
