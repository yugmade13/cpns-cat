// Menyusun prompt untuk AI (ChatGPT, Claude, Gemini, dll.) agar menghasilkan soal
// dalam format JSON yang langsung bisa diunggah ke aplikasi.
import type { Category, CategoryFilter, Difficulty } from '../types';
import { SUPPORTED_TOPICS, TIU_TOPIC_SUBTYPE } from './topics';

export interface AiPromptOptions {
  category: CategoryFilter;
  /** Jumlah soal per kategori. */
  count: number;
  difficulty: Difficulty | 'ALL';
  /** Topik tertentu, atau 'ALL' untuk sebaran topik dari daftar. */
  topic: string | 'ALL';
  /** Awalan ID agar tidak bentrok dengan soal yang sudah ada. */
  idPrefix: string;
}

const FENCE = '```';

const DIFF_TEXT: Record<Difficulty, string> = { easy: 'mudah (easy)', medium: 'sedang (medium)', hard: 'sulit (hard)' };

/** Awalan ID unik berbasis waktu, mis. "ai2611251432". */
export function makeIdPrefix(date: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `ai${String(date.getFullYear()).slice(2)}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}`;
}

const CHOICE_EXAMPLE = (prefix: string) => `{
  "id": "${prefix}-twk-001",
  "category": "TWK",
  "topic": "UUD 1945",
  "difficulty": "medium",
  "question": "Teks soal lengkap …",
  "options": [
    { "id": "A", "text": "…" },
    { "id": "B", "text": "…" },
    { "id": "C", "text": "…" },
    { "id": "D", "text": "…" },
    { "id": "E", "text": "…" }
  ],
  "correctAnswer": "C",
  "explanation": "Mengapa jawaban benar, dijelaskan runtut.",
  "optionNotes": { "A": "Mengapa A kurang tepat.", "B": "…", "D": "…", "E": "…" },
  "reference": "Dasar konstitusional/historis (wajib untuk TWK, hapus field ini untuk TIU).",
  "subtype": "numerik",
  "solutionSteps": ["Langkah 1 …", "Langkah 2 …"],
  "shortcut": "Trik cepat saat ujian.",
  "timeTip": "Satu kalimat tips hemat waktu.",
  "tags": ["kata kunci"],
  "shuffleOptions": true
}`;

const TKP_EXAMPLE = (prefix: string) => `{
  "id": "${prefix}-tkp-001",
  "category": "TKP",
  "topic": "Pelayanan publik",
  "difficulty": "medium",
  "context": "Situasi kerja yang realistis dan spesifik …",
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
  "whyBest": "Mengapa opsi terbaik paling tepat.",
  "lesson": "Pelajaran untuk dunia kerja",
  "tags": [],
  "shuffleOptions": true
}`;

function categoryRules(cat: Category): string {
  if (cat === 'TWK') {
    return `ATURAN TWK
- Wajib ada "correctAnswer" dan "reference" (dasar konstitusional, historis, atau konsep kebangsaan yang relevan).
- Fakta harus akurat: nomor pasal, ayat, tahun, nama tokoh, bunyi sila, dan peristiwa sejarah. Jika tidak yakin pada suatu fakta, buat soal lain yang konsepnya pasti.
- Jangan sertakan field "subtype", "solutionSteps", "shortcut", "timeTip" untuk TWK (atau biarkan kosong).`;
  }
  if (cat === 'TIU') {
    const groups = (['verbal', 'numerik', 'logika'] as const)
      .map((s) => `  - ${s}: ${Object.entries(TIU_TOPIC_SUBTYPE).filter(([, v]) => v === s).map(([k]) => k).join(', ')}`)
      .join('\n');
    return `ATURAN TIU
- Wajib ada "correctAnswer" dan "subtype" ("verbal", "numerik", atau "logika") sesuai topik:
${groups}
- TIU numerik WAJIB punya "solutionSteps" (langkah hitung bertahap, bahasa sederhana), "shortcut" (Cara Cepat), dan "timeTip".
- Hitung ulang setiap soal numerik secara independen sebelum menulisnya. Pastikan TEPAT SATU opsi yang benar dan opsi pengecoh berasal dari kesalahan hitung yang masuk akal.
- TIU verbal/logika: "explanation" menjelaskan alur penalaran, bukan hanya menyebut jawaban. "timeTip" boleh diisi.
- Tabel data ditulis di dalam "question" dengan pemisah "|" per kolom dan baris baru "\\n" (baris pertama = judul kolom), contoh: "Bulan | Jumlah\\nJanuari | 240\\nFebruari | 300".
- Jangan sertakan "reference" untuk TIU.`;
  }
  return `ATURAN TKP
- JANGAN ada "correctAnswer". Setiap opsi punya "score" bilangan bulat 1–5 dan "explanation".
- Kelima skor dalam satu soal HARUS berbeda semua: tepat satu opsi untuk tiap nilai 1, 2, 3, 4, 5.
- Wajib ada "context", "competency", "principle", "whyBest", "lesson".
- Skenario realistis: loket pelayanan, rekan kerja, atasan, aturan, tekanan target, media sosial, dan sebagainya.
- Posisi opsi ber-skor 5 harus berpindah-pindah antarsoal (tidak selalu di huruf yang sama).
- Opsi terbaik TIDAK boleh selalu yang paling panjang atau paling sopan bunyinya; skor ditentukan oleh kualitas tindakan. Sertakan opsi yang terdengar ramah tetapi melanggar aturan (skor rendah).`;
}

export function buildAiPrompt(o: AiPromptOptions): string {
  const cats: Category[] = o.category === 'MIX' ? ['TWK', 'TIU', 'TKP'] : [o.category];
  const total = o.count * cats.length;
  const diff =
    o.difficulty === 'ALL'
      ? 'campuran mudah (easy), sedang (medium), dan sulit (hard) dengan porsi seimbang'
      : `semuanya ${DIFF_TEXT[o.difficulty]}`;

  const plan = cats
    .map((c) => {
      const topics =
        o.topic !== 'ALL' && o.category !== 'MIX'
          ? `semua bertopik "${o.topic}"`
          : `topik disebar dari daftar berikut (minimal 2 topik berbeda, nama topik ditulis persis): ${SUPPORTED_TOPICS[c].join('; ')}`;
      return `- ${o.count} soal ${c}, ID "${o.idPrefix}-${c.toLowerCase()}-001" sampai "${o.idPrefix}-${c.toLowerCase()}-${String(o.count).padStart(3, '0')}"; ${topics}.`;
    })
    .join('\n');

  const needsChoice = cats.some((c) => c !== 'TKP');
  const needsTkp = cats.includes('TKP');
  const examples = [needsChoice ? `Contoh soal TWK/TIU:\n${CHOICE_EXAMPLE(o.idPrefix)}` : '', needsTkp ? `Contoh soal TKP:\n${TKP_EXAMPLE(o.idPrefix)}` : '']
    .filter(Boolean)
    .join('\n\n');

  return `Kamu adalah penulis soal latihan SKD CPNS (Seleksi Kompetensi Dasar) yang teliti. Buatkan ${total} soal latihan ORISINAL dalam Bahasa Indonesia yang baku dan natural.

RENCANA SOAL
${plan}
- Tingkat kesulitan: ${diff}.

FORMAT KELUARAN (WAJIB)
- Tulis SEMUA soal sebagai SATU array JSON yang valid di dalam SATU blok kode berlabel json (diawali ${FENCE}json dan diakhiri ${FENCE}), supaya bisa disalin sekali klik. Jangan memecahnya ke beberapa blok kode.
- Jika kamu bisa membuat file yang dapat diunduh, buat juga file bernama "${o.idPrefix}.json" berisi array yang sama persis.
- Jangan menulis komentar di dalam JSON. Di luar blok kode, cukup satu kalimat singkat atau tidak sama sekali.
- Gunakan tanda kutip ganda yang benar, tanpa koma di akhir elemen terakhir. Baris baru di dalam teks ditulis sebagai "\\n".
- Semua soal ada di satu array; kategori ditentukan oleh field "category".

${examples}

ATURAN UMUM (soal yang melanggar akan ditolak aplikasi)
- "id" unik, ikuti pola ID pada rencana soal.
- "category": hanya "TWK", "TIU", atau "TKP". "difficulty": hanya "easy", "medium", atau "hard".
- Tepat 5 opsi dengan "id" "A", "B", "C", "D", "E" berurutan; teks tidak boleh kosong dan tidak boleh ada dua opsi dengan teks sama.
- TWK/TIU: "correctAnswer" salah satu dari "A"–"E"; "explanation" wajib; isi "optionNotes" untuk keempat opsi yang salah.
- Sebarkan huruf jawaban benar TWK/TIU secara merata di A–E (tidak ada huruf yang mendominasi).
- Opsi akan diacak oleh aplikasi. Jika teks soal atau opsi merujuk ke opsi lain (mis. "A dan B benar", "semua jawaban di atas benar", "tidak ada jawaban yang benar"), set "shuffleOptions": false. Selain itu set "shuffleOptions": true. Sebaiknya hindari opsi seperti itu.
- Di pembahasan, jika perlu menyebut huruf opsi, tulis dengan pola "opsi X" (mis. "opsi C"), bukan "(C)" atau "huruf C".

${cats.map(categoryRules).join('\n\n')}

LARANGAN
- Soal placeholder (mis. "Soal 1", "Contoh soal") atau teks "…" di keluaran akhir.
- Soal yang sama dengan hanya mengganti nama atau angka; soal yang sangat mirip satu sama lain.
- Soal ambigu atau dua opsi yang sama-sama benar (TWK/TIU).
- Rujukan konstitusi atau sejarah yang keliru, dan perhitungan yang salah.
- Klaim bahwa soal berasal dari ujian resmi BKN.

Sebelum menjawab, periksa ulang setiap soal terhadap semua aturan di atas, lalu tulis hasilnya sesuai FORMAT KELUARAN.`;
}
