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

DISCORD_WEBHOOK1=https://discord.com/api/webhooks/...
DISCORD_WEBHOOK2=https://discord.com/api/webhooks/...
```

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
node src/index.js
```

Jika ingin menjalankan di background pada Linux/Termux, gunakan `nohup` atau `tmux`/`screen`.

## Troubleshooting
- Jika gagal terkoneksi dengan IMAP, periksa kembali `EMAIL`, `PASSWORD`, `IMAP_HOST`, `IMAP_PORT`, dan `IMAP_SECURE`.
- Pastikan akun email mendukung akses IMAP.
- Pastikan URL webhook Discord valid.
