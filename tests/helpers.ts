import { OPTION_IDS, type ChoiceQuestion, type Question, type TkpQuestion } from '../src/types';

/** Generator acak deterministik (mulberry32) agar test bisa diulang. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeChoice(overrides: Partial<ChoiceQuestion> = {}): ChoiceQuestion {
  return {
    id: 'x-1',
    category: 'TIU',
    topic: 'Uji',
    difficulty: 'easy',
    question: 'Berapakah 2 + 2?',
    options: [
      { id: 'A', text: '3' },
      { id: 'B', text: '4' },
      { id: 'C', text: '5' },
      { id: 'D', text: '6' },
      { id: 'E', text: '7' },
    ],
    correctAnswer: 'B',
    explanation: 'Dua ditambah dua sama dengan empat.',
    optionNotes: {},
    solutionSteps: [],
    shortcut: '',
    timeTip: '',
    tags: [],
    shuffleOptions: true,
    ...overrides,
  };
}

export function makeTkp(overrides: Partial<TkpQuestion> = {}): TkpQuestion {
  return {
    id: 't-1',
    category: 'TKP',
    topic: 'Uji TKP',
    difficulty: 'medium',
    context: 'Situasi kerja.',
    question: 'Apa yang Anda lakukan?',
    options: [
      { id: 'A', text: 'Satu', score: 3, explanation: 'x' },
      { id: 'B', text: 'Dua', score: 5, explanation: 'x' },
      { id: 'C', text: 'Tiga', score: 1, explanation: 'x' },
      { id: 'D', text: 'Empat', score: 4, explanation: 'x' },
      { id: 'E', text: 'Lima', score: 2, explanation: 'x' },
    ],
    competency: 'c',
    principle: 'p',
    whyBest: 'w',
    lesson: 'l',
    tags: [],
    shuffleOptions: true,
    ...overrides,
  };
}

const SCORE_PATTERNS = [
  [3, 5, 1, 4, 2],
  [5, 2, 4, 1, 3],
  [1, 3, 5, 2, 4],
  [2, 4, 3, 5, 1],
  [4, 1, 2, 3, 5],
];

/**
 * Bank soal tiruan untuk pengujian: 6 TWK, 6 TIU (satu dengan shuffleOptions: false), 5 TKP.
 * Teks opsi dibuat unik per soal agar pemetaan isi→kunci bisa diperiksa.
 */
export function fixtureBank(): Question[] {
  const out: Question[] = [];
  for (let i = 0; i < 12; i++) {
    const category = i < 6 ? 'TWK' : 'TIU';
    const id = `${category.toLowerCase()}-${String(i + 1).padStart(3, '0')}`;
    const fixed = i === 11;
    out.push(
      makeChoice({
        id,
        category,
        topic: i % 2 === 0 ? 'Topik Genap' : 'Topik Ganjil',
        difficulty: (['easy', 'medium', 'hard'] as const)[i % 3],
        question: `Pertanyaan uji nomor ${i + 1} tentang materi ${category}?`,
        options: OPTION_IDS.map((oid, k) => ({
          id: oid,
          text: fixed && k === 4 ? 'Pernyataan A dan B benar' : `Jawaban ${oid} untuk soal ${i + 1}`,
        })),
        correctAnswer: OPTION_IDS[i % 5]!,
        shuffleOptions: !fixed,
      }),
    );
  }
  SCORE_PATTERNS.forEach((scores, i) => {
    out.push(
      makeTkp({
        id: `tkp-${String(i + 1).padStart(3, '0')}`,
        topic: i % 2 === 0 ? 'Integritas' : 'Pelayanan publik',
        context: `Situasi kerja uji nomor ${i + 1}.`,
        options: OPTION_IDS.map((oid, k) => ({
          id: oid,
          text: `Tindakan ${oid} pada situasi ${i + 1}`,
          score: scores[k]!,
          explanation: `Alasan skor ${scores[k]}.`,
        })),
      }),
    );
  });
  return out;
}
