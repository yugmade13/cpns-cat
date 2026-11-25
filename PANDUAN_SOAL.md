# Panduan Penulisan Soal — Latihan SKD CPNS 2026

Dokumen ini adalah acuan untuk menambah soal ke `public/data/twk.json`, `tiu.json`, dan `tkp.json`.
Aplikasi memuat berkas-berkas ini saat dibuka, jadi **menambah soal tidak perlu mengubah kode atau build ulang**
(pada hosting statis cukup unggah ulang berkas JSON-nya).

Setelah setiap batch soal, jalankan:

```bash
npm run validate   # aturan format, duplikasi, sebaran jawaban
npm test           # termasuk verifikasi hitungan TIU numerik
```

---

## 1. Format JSON

Setiap berkas berisi **array** soal. Ketiga berkas memakai format yang sama; kategori ditentukan oleh field `category`
(berkas hanya untuk kerapian).

### 1.1 Soal TWK dan TIU

```json
{
  "id": "twk-006",
  "category": "TWK",
  "topic": "UUD 1945",
  "difficulty": "medium",
  "question": "Teks soal …",
  "options": [
    { "id": "A", "text": "…" },
    { "id": "B", "text": "…" },
    { "id": "C", "text": "…" },
    { "id": "D", "text": "…" },
    { "id": "E", "text": "…" }
  ],
  "correctAnswer": "C",
  "explanation": "Mengapa jawaban benar.",
  "optionNotes": { "A": "kenapa kurang tepat", "B": "…", "D": "…", "E": "…" },
  "reference": "Dasar konstitusional/historis (wajib diusahakan untuk TWK).",
  "subtype": "numerik",
  "solutionSteps": ["Langkah 1 …", "Langkah 2 …"],
  "shortcut": "Trik cepat saat ujian.",
  "timeTip": "Satu kalimat tips hemat waktu.",
  "tags": ["kata kunci"],
  "shuffleOptions": true
}
```

| Field | Wajib | Keterangan |
|---|---|---|
| `id` | ya | Unik di seluruh bank soal. Pola: `twk-001`, `tiu-001`, `tkp-001`. |
| `category` | ya | `TWK`, `TIU`, atau `TKP`. |
| `topic` | ya | Pakai nama dari daftar topik (bagian 3) agar filter rapi. |
| `difficulty` | ya | `easy`, `medium`, atau `hard`. |
| `question` | ya | Teks soal. Baris baru (`\n`) dipertahankan. Baris yang mengandung `\|` ditampilkan sebagai **tabel** (baris pertama = judul kolom). |
| `options` | ya | Tepat 5 opsi, id `A`–`E`. |
| `correctAnswer` | ya | Huruf opsi benar (huruf **asli** di JSON). |
| `explanation` | ya | Pembahasan. Untuk TIU verbal/logika, tulis alur penalarannya. |
| `optionNotes` | disarankan | Alasan tiap opsi salah. Validator memberi peringatan bila ada yang kosong. |
| `reference` | disarankan (TWK) | Ditampilkan di kotak "Dasar dan Rujukan". |
| `subtype` | disarankan (TIU) | `verbal`, `numerik`, atau `logika`. |
| `solutionSteps` | wajib untuk TIU numerik* | Array langkah hitung bertahap. |
| `shortcut` | wajib untuk TIU numerik* | Ditampilkan di kotak **Cara Cepat**. |
| `timeTip` | wajib untuk TIU numerik* | Satu baris **Tips Hemat Waktu** (boleh juga untuk verbal/logika). |
| `tags` | tidak | Array kata kunci. |
| `shuffleOptions` | tidak (default `true`) | Isi `false` jika soal/opsi merujuk opsi lain. |

\* Validator memberi peringatan (bukan error) jika kosong.

### 1.2 Soal TKP

```json
{
  "id": "tkp-006",
  "category": "TKP",
  "topic": "Pelayanan publik",
  "difficulty": "medium",
  "context": "Situasi kerja yang realistis …",
  "question": "Apa yang sebaiknya Anda lakukan?",
  "options": [
    { "id": "A", "text": "…", "score": 3, "explanation": "Mengapa skornya 3." },
    { "id": "B", "text": "…", "score": 5, "explanation": "…" },
    { "id": "C", "text": "…", "score": 1, "explanation": "…" },
    { "id": "D", "text": "…", "score": 4, "explanation": "…" },
    { "id": "E", "text": "…", "score": 2, "explanation": "…" }
  ],
  "competency": "Kompetensi yang diuji",
  "principle": "Prinsip perilaku yang mendasari",
  "whyBest": "Mengapa opsi terbaik paling tepat. Boleh menyebut \"Opsi B\".",
  "lesson": "Pelajaran untuk dunia kerja",
  "tags": [],
  "shuffleOptions": true
}
```

TKP **tidak** memakai `correctAnswer`. Setiap opsi wajib punya `score` dan `explanation`.

### 1.3 Alias yang diterima (untuk impor)

Normalizer di `src/lib/loader.ts` menerima alias berikut dan mengubahnya ke format baku:

| Alias | Field baku |
|---|---|
| `pertanyaan`, `soal` | `question` |
| `jawaban_benar`, `jawabanBenar`, `kunci`, `kunci_jawaban` | `correctAnswer` |
| `pembahasan` | `explanation` |
| `kategori` | `category` |
| `topik` | `topic` |
| `kesulitan`, `tingkat_kesulitan` (nilai `mudah`/`sedang`/`sulit`) | `difficulty` |
| `opsi`, `pilihan` | `options` |
| `konteks`, `situasi` | `context` |
| `kompetensi`, `prinsip`, `alasan_terbaik`, `pelajaran` | `competency`, `principle`, `whyBest`, `lesson` |
| opsi: `teks`, `skor`, `pembahasan`/`alasan` | `text`, `score`, `explanation` |

Opsi boleh ditulis sebagai objek: `"options": { "A": "…", "B": "…", … }`.
Field yang tidak dikenali disimpan di `extra` sehingga tidak hilang saat diekspor.

### 1.4 Rujukan huruf opsi di pembahasan

Karena opsi diacak, huruf yang dilihat pengguna bisa berbeda dari huruf di JSON. Aplikasi otomatis mengganti
frasa **"opsi X"**, **"pilihan X"**, dan **"jawaban X"** di `explanation`, `optionNotes`, `whyBest`, dan penjelasan opsi
TKP ke huruf tampilan yang benar. **Jangan** merujuk huruf dengan cara lain (misalnya "huruf C" atau "(C)").
Lebih aman lagi: sebut isi opsinya, bukan hurufnya.

---

## 2. Aturan validasi

Soal yang melanggar aturan berikut **ditolak** (dilewati oleh aplikasi dan dicatat di console; `npm run validate` gagal):

- `id` unik di seluruh bank soal.
- Tepat lima opsi dengan id A, B, C, D, E; teks tidak kosong; tidak ada dua opsi dengan teks sama.
- `category` hanya `TWK`, `TIU`, `TKP`. `difficulty` hanya `easy`, `medium`, `hard`.
- TWK/TIU: `correctAnswer` salah satu dari A–E dan `explanation` tidak kosong.
- TKP: setiap `score` bilangan bulat 1–5, kelima skor **berbeda semua** (tepat satu opsi untuk nilai 1, 2, 3, 4, 5),
  dan setiap opsi punya `explanation`.
- Jika teks soal/opsi merujuk opsi lain ("A dan B benar", "semua jawaban di atas", "tidak ada jawaban yang benar",
  "pernyataan A"), `shuffleOptions` wajib `false`.

Selain itu `npm run validate` gagal jika ada **teks soal yang sama persis** dengan soal lain (aplikasi tetap
menampilkan keduanya; pemeriksaan ini hanya di validator).

Peringatan (tidak menggagalkan validasi, tetapi sebaiknya diperbaiki):

- `optionNotes` kosong untuk opsi salah; TWK tanpa `reference`; TIU tanpa `subtype`.
- TIU numerik tanpa `solutionSteps`, `shortcut`, atau `timeTip`.
- TKP tanpa `context`, `competency`, `principle`, `whyBest`, atau `lesson`.
- Dua soal sangat mirip (kemiripan kata ≥ 80%).
- Satu huruf jawaban benar (TWK/TIU) atau posisi skor 5 (TKP) mendominasi lebih dari 35% (berlaku jika ≥ 10 soal).
- Opsi skor 5 terlalu sering (> 40%) menjadi opsi terpanjang.

---

## 3. Daftar topik yang didukung

Tulis nama topik persis seperti di bawah agar filter topik tidak terpecah.

**TWK:** Pancasila · UUD 1945 · NKRI · Bhinneka Tunggal Ika · Nasionalisme · Bela negara · Integritas ·
Sejarah Indonesia · Tata negara · Peran dan kedudukan ASN

**TIU:**
- verbal: Analogi · Sinonim · Antonim · Silogisme · Penarikan kesimpulan · Pemahaman bacaan
- numerik: Aritmetika · Persentase · Perbandingan · Pecahan · Deret angka · Soal cerita · Untung rugi · Rata-rata ·
  Jarak, waktu, dan kecepatan · Kerja bersama
- logika: Penalaran analitis · Pernyataan bersyarat · Interpretasi data

(Silogisme dan penarikan kesimpulan boleh memakai `subtype` `logika` bila lebih tepat.)

**TKP:** Pelayanan publik · Jejaring kerja · Sosial budaya · Teknologi informasi · Profesionalisme · Integritas ·
Anti-radikalisme · Komunikasi · Adaptasi · Pengambilan keputusan · Kerja sama · Orientasi hasil · Disiplin ·
Tanggung jawab · Pengembangan diri · Manajemen konflik

Target bank soal lengkap: 30 soal per kategori, ditulis per batch kecil (10–15 per kategori), validator dijalankan
setelah tiap batch.

---

## 4. Aturan kualitas

Kualitas lebih penting daripada jumlah.

**Larangan keras**
- Soal placeholder ("Soal 1", "Contoh soal").
- Soal yang sama dengan hanya mengganti nama atau angka.
- Soal ambigu, atau dua opsi yang sama-sama benar (TWK/TIU).
- Rujukan konstitusi atau sejarah yang keliru (nomor pasal, tahun, tokoh, bunyi sila, dll.).
  Jika ragu pada suatu fakta, ganti dengan soal yang konsepnya pasti.
- Perhitungan TIU yang salah.
- Klaim bahwa soal berasal dari ujian resmi.

**Variasi**
- Campuran `easy`, `medium`, `hard` di setiap kategori.
- Huruf jawaban benar TWK/TIU tersebar merata di A–E.
- TKP: posisi skor 5 berganti-ganti; opsi terbaik **tidak** selalu yang terpanjang atau paling sopan bunyinya.
  Skor ditentukan oleh kualitas tindakan. Sertakan opsi yang terdengar ramah tetapi melanggar aturan (skor rendah).
- Skenario TKP realistis: loket pelayanan, rekan kerja, atasan, aturan, tekanan target, media sosial, dan sebagainya.

**Pembahasan**
- TWK: sertakan dasar konstitusional, historis, atau konsep kebangsaan di `reference`.
- TIU numerik: langkah hitung bertahap dengan bahasa sederhana, satu trik di `shortcut`, satu baris di `timeTip`.
- TIU verbal/logika: jelaskan alur penalaran, bukan sekadar menyebut jawaban.
- TKP: penjelasan untuk kelima opsi, plus `competency`, `principle`, `whyBest`, `lesson`.

**Verifikasi TIU numerik**
Setiap soal numerik wajib dihitung ulang secara independen. Tambahkan pengecekan di `tests/numeric.test.ts`
(hitung ulang dari angka di soal, lalu pastikan **tepat satu** opsi yang cocok dengan `correctAnswer`). Test di berkas
itu juga gagal jika ada soal `subtype: "numerik"` yang belum punya verifikasi, sehingga daftar di test harus diperbarui.
