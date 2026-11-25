# Panduan Penulisan Soal — Simulasi SKD CPNS 2027

Dokumen ini adalah acuan untuk menulis file soal (`.json`) yang diunggah ke aplikasi.
Aplikasi **tidak membawa soal bawaan**: pengguna mengunggah file soal lewat layar "Unggah Bank Soal" atau menu
"Kelola Bank Soal". Prompt AI meminta AI membuat file bernama sesuai awalan ID (mis. `ai2611251432xy.json`). Soal disimpan di browser pengguna (IndexedDB) sehingga cukup diunggah sekali per browser.

- Satu file boleh berisi soal **TWK, TIU, dan TKP sekaligus**. Kategori ditentukan oleh field `category` tiap soal,
  bukan oleh nama file.
- Boleh juga memecah soal ke beberapa file (misalnya per kategori atau per batch). Beberapa file bisa diunggah sekaligus.
- Mengunggah file dengan **nama yang sama** akan mengganti isi file lama (aplikasi meminta konfirmasi).
- Soal yang tidak valid dilewati; alasannya ditampilkan di laporan unggahan dan dicatat di console browser.

Untuk membuat soal dengan bantuan AI, pakai tombol **Salin Prompt** di panel "Buat Soal dengan AI" (layar unggah atau
menu Kelola Bank Soal). Prompt tersebut sudah memuat format dan aturan di dokumen ini (disusun di `src/lib/aiPrompt.ts`;
jika aturan di dokumen ini berubah, perbarui juga file itu). Hasil AI tetap wajib diperiksa terhadap aturan kualitas
di bagian 4.

Sebelum mengunggah, periksa file dengan validator:

```bash
npm run validate -- bank-soal.json        # satu file
npm run validate -- twk.json tiu.json     # beberapa file (ID dicek unik lintas file)
npm run validate -- folder-soal           # semua .json di folder
npm run validate                          # default: semua .json di folder bank-soal/
```

---

## 1. Format JSON

Setiap file berisi **array** soal (atau objek `{ "questions": [ … ] }`). Soal TWK/TIU dan TKP memakai bentuk yang
sedikit berbeda (lihat 1.1 dan 1.2), tetapi boleh dicampur dalam satu array.

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

### 1.3 Contoh satu file gabungan

```json
[
  { "id": "twk-001", "category": "TWK", "topic": "Pancasila", "difficulty": "easy",
    "question": "…", "options": [ { "id": "A", "text": "…" }, … ],
    "correctAnswer": "C", "explanation": "…", "reference": "…" },
  { "id": "tiu-001", "category": "TIU", "subtype": "numerik", "topic": "Deret angka", "difficulty": "medium",
    "question": "…", "options": [ … ], "correctAnswer": "D", "explanation": "…",
    "solutionSteps": ["…"], "shortcut": "…", "timeTip": "…" },
  { "id": "tkp-001", "category": "TKP", "topic": "Integritas", "difficulty": "hard",
    "context": "…", "question": "Apa yang sebaiknya Anda lakukan?",
    "options": [ { "id": "A", "text": "…", "score": 4, "explanation": "…" }, … ],
    "competency": "…", "principle": "…", "whyBest": "…", "lesson": "…" }
]
```

(`…` hanya penanda singkat di dokumen ini; file sungguhan harus berisi lima opsi lengkap.)

### 1.4 Alias yang diterima

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

### 1.5 Rujukan huruf opsi di pembahasan

Karena opsi diacak, huruf yang dilihat pengguna bisa berbeda dari huruf di JSON. Aplikasi otomatis mengganti
frasa **"opsi X"**, **"pilihan X"**, dan **"jawaban X"** di `explanation`, `optionNotes`, `whyBest`, dan penjelasan opsi
TKP ke huruf tampilan yang benar. **Jangan** merujuk huruf dengan cara lain (misalnya "huruf C" atau "(C)").
Lebih aman lagi: sebut isi opsinya, bukan hurufnya.

---

## 2. Aturan validasi

Soal yang melanggar aturan berikut **ditolak** (dilewati saat diunggah dan dicantumkan di laporan unggahan;
`npm run validate` gagal):

- `id` unik di seluruh bank soal, termasuk lintas file yang sudah diunggah. (Saat file bernama sama diganti, ID dari
  versi lamanya tidak dianggap bentrok.)
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

Tulis nama topik persis seperti di bawah agar filter topik tidak terpecah. (Daftar yang sama dipakai prompt AI,
di `src/lib/topics.ts`.)

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
Validator hanya memeriksa format, **bukan** kebenaran hitungan. Setiap soal numerik wajib dihitung ulang secara
independen oleh penulis (misalnya dengan skrip kecil atau hitungan manual kedua) sebelum diunggah, dan dipastikan
**tepat satu** opsi yang cocok dengan `correctAnswer`. Jangan mengandalkan perkiraan.
