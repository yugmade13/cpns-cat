# Latihan SKD CPNS 2026

Aplikasi web latihan soal SKD CPNS (TWK, TIU, TKP) dengan umpan balik langsung dan pembahasan lengkap.
Sepenuhnya statis: tanpa login, tanpa backend, tanpa database.

> **SOAL LATIHAN — BUKAN SOAL RESMI BKN.** Seluruh soal disusun untuk latihan mandiri.

## Fitur

- Pilih kategori (TWK, TIU, TKP, Campuran), topik, tingkat kesulitan, jumlah soal, dan timer per soal (mati/60/90 detik).
- Satu soal per layar; jawaban langsung dikunci dan pembahasan muncul:
  - TWK/TIU: benar/salah (warna + ikon + teks), pembahasan, dasar rujukan, langkah hitung, **Cara Cepat**, dan **Tips Hemat Waktu**.
  - TKP: skor pilihan (1–5), skor dan alasan kelima opsi, kompetensi, prinsip, dan pelajaran kerja.
- Urutan soal dan opsi diacak tiap sesi; kunci/skor mengikuti isi opsi, bukan hurufnya.
- Layar hasil: skor per kategori, topik yang perlu diperkuat, **Ulangi Soal yang Salah**, **Tinjau Semua Jawaban**.
- Bookmark dan daftar soal yang pernah salah (localStorage, opsional), plus "Hapus Data Tersimpan".
- **Kelola Bank Soal**: impor JSON tambahan (hanya selama sesi) dan unduh semua soal aktif.
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
npm run validate   # memeriksa bank soal di public/data
npm test           # unit test (Vitest)
```

> **Catatan Windows:** jalankan `npm test` dari path dengan huruf drive kapital (`D:\…` di PowerShell/CMD, atau
> `cd /D/...` di Git Bash). Jika folder dibuka sebagai `d:\…`, Vitest bisa memuat dirinya dua kali dan semua test
> gagal dengan pesan `Cannot read properties of undefined (reading 'config')`.

## Build dan deploy statis

`npm run build` menghasilkan situs statis di `dist/`. Secara default `base` bernilai `./` (path relatif),
sehingga hasil build bisa dibuka dari domain utama maupun sub-folder.

- **Vercel / Netlify:** build command `npm run build`, output directory `dist`. Tidak perlu konfigurasi server.
- **GitHub Pages:** set sub-path repositori lewat variabel lingkungan `BASE_PATH`, lalu unggah isi `dist/`:

  ```bash
  BASE_PATH=/nama-repo/ npm run build        # Git Bash / macOS / Linux
  $env:BASE_PATH="/nama-repo/"; npm run build  # PowerShell
  ```

  Nilai default `./` biasanya juga sudah berfungsi di GitHub Pages; `BASE_PATH` berguna jika ingin path absolut.

Aplikasi tidak memakai routing URL, jadi tidak perlu aturan *rewrite* atau halaman 404 khusus.

## Menambah soal

Soal disimpan di `public/data/twk.json`, `tiu.json`, dan `tkp.json` dan dimuat dengan `fetch` saat aplikasi dibuka.
Menambah soal cukup dengan mengedit berkas tersebut, tanpa mengubah kode.

1. Baca **[PANDUAN_SOAL.md](PANDUAN_SOAL.md)**: format lengkap, aturan validasi, daftar topik, dan aturan kualitas.
2. Tambahkan soal per batch kecil (10–15 per kategori).
3. Jalankan `npm run validate` dan `npm test`. Untuk soal TIU numerik, tambahkan verifikasi hitungan di
   `tests/numeric.test.ts`.

Ringkasan format: setiap berkas adalah array soal. TWK/TIU memakai `options` (A–E) dan `correctAnswer`;
TKP memakai `score` 1–5 yang berbeda di tiap opsi beserta `explanation`, `context`, `competency`, `principle`,
`whyBest`, dan `lesson`. Soal yang tidak valid dilewati dan alasannya dicatat di console browser.

## Struktur

```
public/data/         bank soal (JSON)
src/types.ts         tipe data soal, sesi, hasil
src/lib/             loader, validate, shuffle, scoring, storage, filter, labels
src/hooks/           useQuizSession (useReducer), useTimer, useBank, useStoredIds
src/components/      StartScreen, QuestionScreen, ResultScreen, ReviewList, FeedbackPanel, OptionButton, …
scripts/validate.ts  validator bank soal (npm run validate)
tests/               unit test Vitest (shuffle, scoring, validate, verifikasi TIU numerik)
```

## Batasan

- Soal adalah **soal latihan, bukan soal resmi BKN**, dan tidak berasal dari ujian resmi.
- Tahap ini baru berisi 15 soal contoh (5 per kategori).
- Tidak ada penyimpanan permanen selain ID soal yang di-bookmark dan ID soal yang pernah salah (localStorage di
  browser). Riwayat sesi dan skor tidak disimpan. Soal hasil impor hilang saat halaman dimuat ulang.
- Penilaian TKP di sini mengikuti skor yang ditetapkan penulis soal; skor TKP pada ujian sebenarnya dapat berbeda.
