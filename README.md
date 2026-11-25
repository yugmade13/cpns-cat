# Latihan SKD CPNS 2027

Aplikasi web latihan soal SKD CPNS (TWK, TIU, TKP) dengan umpan balik langsung dan pembahasan lengkap.
Sepenuhnya statis: tanpa login, tanpa backend, tanpa database server.

> **SOAL LATIHAN — BUKAN SOAL RESMI BKN.** Aplikasi tidak membawa soal bawaan; soal diunggah oleh pengguna.

## Cara pakai

1. Buka aplikasi. Jika belum ada soal, muncul layar **Unggah Bank Soal**.
2. Unggah file `.json` berisi soal (tab **Unggah File**), atau tempel teks JSON langsung (tab **Tempel Teks**). Satu file boleh berisi TWK, TIU, dan TKP sekaligus, dan beberapa file juga bisa
   diunggah bersamaan. Format lengkap ada di **[PANDUAN_SOAL.md](PANDUAN_SOAL.md)**.
   Belum punya file soal? Buka **Buat Soal dengan AI**, pilih kategori, jumlah, kesulitan, dan topik, lalu tekan
   **Salin Prompt**. Tempel prompt ke asisten AI (ChatGPT, Claude, Gemini, dll.). AI diminta menulis JSON di satu blok
   kode (dan membuat file `.json` jika mampu). Salin jawabannya ke tab **Tempel Teks** lalu tekan **Muat Soal dari
   Teks**; tidak perlu membuat file. Kalimat pembuka/penutup dari AI ikut tersalin pun tidak masalah. Jawaban yang masih dibungkus blok kode Markdown (diawali `` ```json ``) tetap diterima.
3. Soal tersimpan di browser itu (IndexedDB), jadi tidak perlu diunggah ulang saat aplikasi dibuka lagi.
4. Tekan **Mulai Latihan**. Semua soal yang diunggah langsung dipakai (diacak); tidak perlu memilih kategori, topik,
   tingkat kesulitan, atau jumlah soal, karena isi latihan sudah ditentukan saat membuat file soal. Jika ada lebih dari
   satu file, pilih "Semua soal" atau satu file tertentu. Waktu latihan bisa dibatasi (10–60 menit untuk
   seluruh sesi).

## Fitur

- Satu soal per layar; jawaban langsung dikunci dan pembahasan muncul:
  - TWK/TIU: benar/salah (warna + ikon + teks), pembahasan, dasar rujukan, langkah hitung, **Cara Cepat**, dan **Tips Hemat Waktu**.
  - TKP: skor pilihan (1–5), skor dan alasan kelima opsi, kompetensi, prinsip, dan pelajaran kerja.
- Urutan soal dan opsi diacak tiap sesi; kunci/skor mengikuti isi opsi, bukan hurufnya.
- **Waktu latihan** (timer total per sesi, seperti ujian): tanpa batas, 10, 15, 20, 30, 45, atau 60 menit, dengan saran
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
  dan waktu latihan. Pilihan terakhir diingat selama aplikasi terbuka.
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

## Menulis soal

Lihat **[PANDUAN_SOAL.md](PANDUAN_SOAL.md)** untuk format JSON (TWK/TIU dan TKP), contoh file gabungan, aturan validasi,
daftar topik, dan aturan kualitas. Ringkasnya: setiap file adalah array soal; TWK/TIU memakai `options` (A–E) dan
`correctAnswer`; TKP memakai `score` 1–5 yang berbeda di tiap opsi beserta `explanation`, `context`, `competency`,
`principle`, `whyBest`, dan `lesson`. Tulis soal per batch kecil dan jalankan validator setelah tiap batch.

## Struktur

```
src/types.ts         tipe data soal, sesi, hasil
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
- Soal adalah **soal latihan, bukan soal resmi BKN**.
- Data yang disimpan, semuanya hanya di browser pengguna dan tidak dikirim ke mana pun:
  - bank soal hasil unggahan (IndexedDB);
  - ID soal yang di-bookmark dan ID soal yang pernah salah (localStorage).

  Riwayat sesi dan skor tidak disimpan. Data berbeda untuk tiap browser/perangkat dan hilang jika data situs dihapus
  atau di mode privat.
- Jika browser tidak mengizinkan IndexedDB, soal tetap bisa dipakai tetapi harus diunggah ulang setiap kali aplikasi
  dibuka (aplikasi menampilkan pemberitahuan).
- Penilaian TKP mengikuti skor yang ditetapkan penulis soal; skor TKP pada ujian sebenarnya dapat berbeda.
