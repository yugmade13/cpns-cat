# Simulasi SKD CPNS 2027

Aplikasi web simulasi SKD CPNS (TWK, TIU, TKP) dengan Mode Latihan (pembahasan langsung) dan Mode Ujian (seperti CAT).
Sepenuhnya statis: tanpa login, tanpa backend, tanpa database server. Aplikasi tidak membawa soal bawaan; soal
diunggah oleh pengguna.

> Aplikasi simulasi mandiri, tidak berafiliasi dengan BKN. Teks ini tampil sebagai satu baris kecil di footer.

## Cara pakai

1. Buka aplikasi dan **masuk** dengan username & password yang terdaftar (lihat "Mengelola pengguna"). Jika belum
   ada soal, muncul layar **Unggah Bank Soal**.
2. Unggah file `.json` berisi soal (tab **Unggah File**), atau tempel teks JSON langsung (tab **Tempel Teks**).
   Satu file boleh berisi TWK, TIU, dan TKP sekaligus, dan beberapa file juga bisa
   diunggah bersamaan. Format lengkap ada di **[PANDUAN_SOAL.md](PANDUAN_SOAL.md)**.
   Belum punya file soal? Buka **Buat Soal dengan AI**, pilih kategori, jumlah, kesulitan, dan topik, lalu tekan
   **Salin Prompt**. Tempel prompt ke asisten AI (ChatGPT, Claude, Gemini, dll.); AI diminta membuat file `.json` yang
   bisa diunduh. Jika AI bisa membuat file, unduh lalu unggah. Tidak semua AI bisa membuat file; jika AI hanya
   menampilkan teks JSON, salin teksnya ke tab **Tempel Teks** lalu tekan **Muat Soal dari Teks**. Kalimat pembuka AI
   atau pembungkus blok kode Markdown (`` ```json ``) yang ikut tersalin tetap diterima.
   - **Jumlah soal adalah jumlah total**: pilihan 5 / 10 / 15 (bawaan 5). Untuk Campuran dibagi seimbang ke TWK, TIU,
     dan TKP (5 → 2/2/1, 10 → 4/3/3, 15 → 5/5/5); pembagiannya tampil di panel AI. AI menulis semua soal dalam satu
     jawaban berformat **JSON ringkas** (tanpa indentasi & field opsional kosong).
   - **Jawaban AI terpotong** (lebih mungkin pada 10–15 soal di AI versi gratis): soal yang sudah lengkap tetap dimuat
     dan ada pemberitahuan. Agar semua soal lengkap, pilih jumlah soal lebih sedikit lalu salin prompt lagi.
   - Menempel/mengunggah ulang set yang sama (ID sama) **menggantikan** versi lamanya setelah konfirmasi.
   - **Nama set** otomatis dibentuk dari pilihan prompt (mis. "TIU · Deret angka · Sulit · 25 Nov 19.00") dan bisa
     diganti lewat **Ganti nama** di Kelola Bank Soal.
3. Soal tersimpan di browser itu (IndexedDB), jadi tidak perlu diunggah ulang saat aplikasi dibuka lagi.
4. Pilih **Mode** dan **Waktu**, lalu tekan **Mulai Latihan** / **Mulai Ujian**. Semua soal yang diunggah langsung
   dipakai (diacak); tidak perlu memilih kategori, topik, tingkat kesulitan, atau jumlah soal, karena isi sesi sudah
   ditentukan saat membuat file soal. Jika ada lebih dari satu file, pilih "Semua soal" atau satu file tertentu.

## Fitur

- **Mode Ujian** (seperti CAT): tanpa pembahasan saat mengerjakan; jawaban bisa diganti; pindah soal lewat
  Sebelumnya/Berikutnya atau **panel nomor soal** (warna: terjawab, ragu-ragu, belum dijawab); tanda **Ragu-ragu**;
  tombol **Selesai Ujian** dengan konfirmasi jumlah soal yang belum dijawab. Skor, pembahasan, dan daftar "pernah salah"
  diperbarui setelah ujian selesai. Keyboard: 1–5/A–E memilih, panah kiri/kanan atau Enter pindah soal.
- **Mode Latihan**: satu soal per layar; jawaban langsung dikunci dan pembahasan muncul:
  - TWK/TIU: benar/salah (warna + ikon + teks), pembahasan, dasar rujukan, langkah hitung, **Cara Cepat**, dan **Tips Hemat Waktu**.
  - TKP: skor pilihan (1–5), skor dan alasan kelima opsi, kompetensi, prinsip, dan pelajaran kerja.
- Urutan soal dan opsi diacak tiap sesi; kunci/skor mengikuti isi opsi, bukan hurufnya.
- **Waktu** (timer total per sesi, berlaku untuk kedua mode): tanpa batas, 10, 15, 20, 30, 45, atau 60 menit, dengan saran
  otomatis ±1 menit per soal (mis. 45 soal → 45 menit). Hitung mundur tampil di header dan berwarna merah di menit
  terakhir. Jika waktu habis, soal yang belum dijawab dihitung tidak terjawab dan layar hasil langsung ditampilkan.
- Dari layar hasil, tombol **Latihan Topik Ini** memulai latihan khusus topik yang masih sering salah.
- Layar hasil: skor per kategori, topik yang perlu diperkuat, **Ulangi Soal yang Salah**, **Tinjau Semua Jawaban**.
- **Kelola Bank Soal**: daftar file yang diunggah (jumlah soal per kategori), tambah/ganti file (nama sama = ganti,
  dengan konfirmasi), dan hapus per file. Menghapus file terakhir mengembalikan aplikasi ke layar unggah.
- **Buat Soal dengan AI**: tombol Salin Prompt menghasilkan prompt berisi format JSON dan seluruh aturan validasi,
  dengan awalan ID unik setiap kali disalin agar batch berbeda tidak bentrok ID. Jika browser menolak akses clipboard,
  prompt ditampilkan untuk disalin manual.
- Layar mulai menampilkan jumlah soal per kategori, pilihan sumber soal (semua, per file, bookmark, pernah salah),
  mode, dan waktu. Pilihan terakhir diingat selama aplikasi terbuka.
- Bookmark dan daftar soal yang pernah salah (localStorage), dengan tombol **Hapus Data Tersimpan** yang terpisah dari
  bank soal.
- Mobile first, mendukung keyboard (1–5 / A–E memilih, Enter lanjut).

## Menjalankan

Butuh Node.js 20 atau lebih baru.

```bash
npm install
npm run dev        # server pengembangan di http://localhost:5173
```

Perintah lain:

```bash
npm run build      # typecheck + build statis ke folder dist/
npm run preview    # menjalankan hasil build secara lokal
npm run validate -- bank-soal.json   # memeriksa file soal sebelum diunggah
npm test           # unit test (Vitest)
```

`npm run validate` menerima satu atau beberapa file maupun folder. Tanpa argumen, validator membaca semua `.json` di
folder `bank-soal/` (jika ada) dan gagal dengan petunjuk jika tidak menemukan file.

> **Catatan Windows:** jalankan `npm test` dari path dengan huruf drive kapital (`D:\…` di PowerShell/CMD, atau
> `cd /D/...` di Git Bash). Jika folder dibuka sebagai `d:\…`, Vitest bisa memuat dirinya dua kali dan semua test
> gagal dengan pesan `Cannot read properties of undefined (reading 'config')`.

## Build dan deploy statis

`npm run build` menghasilkan situs statis di `dist/`. Secara default `base` bernilai `./` (path relatif),
sehingga hasil build bisa dibuka dari domain utama maupun sub-folder.

- **Vercel / Netlify:** build command `npm run build`, output directory `dist`. Tidak perlu konfigurasi server.
- **GitHub Pages:** unggah isi `dist/`. Jika ingin path absolut, set sub-path repositori lewat `BASE_PATH`:

  ```bash
  BASE_PATH=/nama-repo/ npm run build          # Git Bash / macOS / Linux
  $env:BASE_PATH="/nama-repo/"; npm run build  # PowerShell
  ```

Aplikasi tidak memakai routing URL, jadi tidak perlu aturan *rewrite* atau halaman 404 khusus.

### Pratinjau tautan (Open Graph)

Saat tautan aplikasi dibagikan di WhatsApp, Telegram, Facebook, LinkedIn, atau X, yang tampil adalah judul, deskripsi,
dan gambar [public/og-image.png](public/og-image.png) (1200×630). Kebanyakan platform hanya membaca gambar dengan
**alamat lengkap**, jadi isi `SITE_URL` dengan alamat situs setelah di-deploy:

```bash
SITE_URL=https://domainmu.com npm run build                       # Git Bash / macOS / Linux
$env:SITE_URL="https://domainmu.com"; npm run build               # PowerShell
SITE_URL=https://username.github.io/nama-repo npm run build       # GitHub Pages
```

**Di Vercel tidak perlu mengatur apa pun:** bila `SITE_URL` kosong, build memakai domain produksi yang disediakan
Vercel (`VERCEL_PROJECT_PRODUCTION_URL`, cadangannya `VERCEL_URL`). Log build menampilkan baris
`[open-graph] og:image → https://…/og-image.png` sebagai tanda alamatnya sudah terisi. Isi `SITE_URL` hanya bila memakai
domain sendiri. Di hosting lain (Netlify, GitHub Pages), isi `SITE_URL` sebagai *Environment Variable*. Tanpa alamat
apa pun, build tetap berhasil tetapi menampilkan peringatan dan pratinjau gambar kemungkinan tidak muncul.

Teks pratinjau ada di bagian `og:`/`twitter:` pada [index.html](index.html). Desain gambarnya ada di
[design/og-image.html](design/og-image.html) beserta cara membuat ulang PNG-nya. Setelah deploy, cek hasilnya di
[opengraph.xyz](https://www.opengraph.xyz/) atau Facebook Sharing Debugger; platform menyimpan pratinjau dalam cache,
jadi perubahan bisa butuh waktu untuk terlihat.

## Mengelola pengguna (login)

Aplikasi memakai login sederhana tanpa server: daftar pengguna ditulis di
[src/config/users.ts](src/config/users.ts) sebagai array `{ username, password, name }`. Hanya pengguna di daftar itu
yang bisa masuk.

```ts
export const USERS: AppUser[] = [
  { username: 'andi', password: 'skd-andi-27', name: 'Andi' },
  { username: 'budi', password: 'skd-budi-27', name: 'Budi' },
];
```

- **Ganti contoh bawaan** (`peserta1` / `peserta2`) sebelum aplikasi dipakai.
- Setelah menambah, mengubah, atau menghapus pengguna, **build dan deploy ulang** (`npm run build`).
  `npm test` ikut memeriksa daftar ini (username ganda, kosong, berspasi, atau tanpa password).
- Username tidak membedakan huruf besar/kecil; password membedakan.
- Status login disimpan di browser (localStorage) dan bertahan sampai pengguna menekan **Keluar**. Pengguna yang
  dihapus dari daftar otomatis keluar saat aplikasi dibuka lagi.
- **Data tiap pengguna terpisah** (bank soal, bookmark, soal pernah salah) dan tetap tersimpan setelah keluar.
- Keluar saat latihan/ujian sedang berjalan meminta konfirmasi, karena jawaban sesi itu tidak disimpan.

> **Penting:** ini hanya gerbang sederhana, **bukan pengamanan**. Daftar pengguna dan password ikut terkirim ke
> browser dan bisa dibaca lewat DevTools, dan status login bisa diubah oleh orang yang paham teknis. Gunakan password
> khusus aplikasi ini (jangan password email/akun pribadi). Untuk pengamanan sungguhan, pakai proteksi di tingkat
> hosting (mis. password protection Netlify/Vercel atau Cloudflare Access).

## Menulis soal

Lihat **[PANDUAN_SOAL.md](PANDUAN_SOAL.md)** untuk format JSON (TWK/TIU dan TKP), contoh file gabungan, aturan validasi,
daftar topik, dan aturan kualitas. Ringkasnya: setiap file adalah array soal; TWK/TIU memakai `options` (A–E) dan
`correctAnswer`; TKP memakai `score` 1–5 yang berbeda di tiap opsi beserta `explanation`, `context`, `competency`,
`principle`, `whyBest`, dan `lesson`. Tulis soal per batch kecil dan jalankan validator setelah tiap batch.

## Struktur

```
src/types.ts         tipe data soal, sesi, hasil
src/config/users.ts  daftar pengguna yang boleh login
src/auth/            AuthContext (login/logout, status login di localStorage)
src/App.tsx          gerbang: layar login atau Workspace (ruang kerja per pengguna)
src/lib/             loader (normalisasi), validate, bankFiles (impor/ganti file), bankStore (IndexedDB),
                     shuffle, scoring, storage (localStorage), aiPrompt, topics, sessionTimer, clipboard, labels
src/hooks/           useQuizSession (useReducer), useCountdown (timer sesi), useBank, useStoredIds
src/components/      UploadScreen, UploadPanel, AiPromptPanel, StartScreen, BankManager, QuestionScreen, ResultScreen,
                     ReviewList, FeedbackPanel, OptionButton, …
scripts/validate.ts  validator file soal (npm run validate)
tests/               unit test Vitest (shuffle, scoring + timer sesi, validate, impor bank soal, prompt AI)
                     dengan data tiruan
```

## Batasan

- Aplikasi tidak menyertakan soal; kualitas dan kebenaran soal menjadi tanggung jawab penulis file soal.
  Validator memeriksa format, bukan kebenaran isi atau hitungan. Ini juga berlaku untuk soal buatan AI: AI bisa
  keliru soal fakta TWK maupun hitungan TIU, jadi periksa ulang sebelum dipakai.
- Login hanya gerbang sederhana di browser, bukan pengamanan (lihat "Mengelola pengguna").
- Aplikasi ini simulasi mandiri dan **tidak berafiliasi dengan BKN**; soal berasal dari pengguna, bukan soal resmi.
- Data yang disimpan, semuanya hanya di browser pengguna dan tidak dikirim ke mana pun:
  - status login (localStorage);
  - per pengguna: bank soal hasil unggahan (IndexedDB) serta ID soal yang di-bookmark dan pernah salah (localStorage).

  Riwayat sesi dan skor tidak disimpan. Data berbeda untuk tiap browser/perangkat dan hilang jika data situs dihapus
  atau di mode privat.
- Jika browser tidak mengizinkan IndexedDB, soal tetap bisa dipakai tetapi harus diunggah ulang setiap kali aplikasi
  dibuka (aplikasi menampilkan pemberitahuan).
- Penilaian TKP mengikuti skor yang ditetapkan penulis soal; skor TKP pada ujian sebenarnya dapat berbeda.
