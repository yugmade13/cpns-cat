// Pengacakan soal dan opsi. Kunci jawaban & skor selalu mengikuti ISI opsi
// (disimpan lewat originalId), bukan huruf tampilannya.
import { OPTION_IDS, type Question, type SessionOption, type SessionQuestion } from '../types';

export type Rng = () => number;

/** Fisher–Yates; mengembalikan array baru, input tidak diubah. */
export function shuffleArray<T>(items: readonly T[], rng: Rng = Math.random): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Membuat versi sesi dari satu soal: opsi diacak (jika boleh) lalu diberi huruf A–E baru. */
export function buildSessionQuestion(question: Question, rng: Rng = Math.random): SessionQuestion {
  const base: SessionOption[] =
    question.category === 'TKP'
      ? question.options.map((o) => ({
          label: o.id,
          originalId: o.id,
          text: o.text,
          score: o.score,
          explanation: o.explanation,
        }))
      : question.options.map((o) => ({ label: o.id, originalId: o.id, text: o.text }));

  const ordered = question.shuffleOptions ? shuffleArray(base, rng) : base;
  const options = ordered.map((o, i) => ({ ...o, label: OPTION_IDS[i]! }));
  return { question, options };
}

/** Membuang soal dengan ID ganda (yang pertama dipertahankan). */
export function uniqueById(questions: readonly Question[]): Question[] {
  const seen = new Set<string>();
  return questions.filter((q) => (seen.has(q.id) ? false : (seen.add(q.id), true)));
}

/**
 * Menyusun sesi: soal unik, urutan diacak, dipotong sesuai jumlah,
 * lalu opsi tiap soal diacak.
 */
export function buildSession(questions: readonly Question[], count: number, rng: Rng = Math.random): SessionQuestion[] {
  const picked = shuffleArray(uniqueById(questions), rng).slice(0, Math.max(0, count));
  return picked.map((q) => buildSessionQuestion(q, rng));
}

/**
 * Menyesuaikan rujukan huruf opsi di teks pembahasan ("opsi C", "jawaban B")
 * dengan huruf tampilan setelah pengacakan.
 */
export function relabelText(text: string, sq: SessionQuestion): string {
  if (!sq.question.shuffleOptions) return text;
  return text.replace(/\b(opsi|pilihan|jawaban)(\s+)([A-E])\b/gi, (m, word: string, sp: string, id: string) => {
    const opt = sq.options.find((o) => o.originalId === id);
    return opt ? `${word}${sp}${opt.label}` : m;
  });
}
