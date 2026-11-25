// Aturan validasi soal. Dipakai oleh aplikasi (loader) dan oleh scripts/validate.ts.
import {
  CATEGORIES,
  DIFFICULTIES,
  OPTION_IDS,
  type Category,
  type ChoiceQuestion,
  type Difficulty,
  type OptionId,
  type Question,
  type TiuSubtype,
  type TkpOption,
  type TkpQuestion,
} from '../types';

export interface ValidationResult {
  question: Question | null;
  errors: string[];
  warnings: string[];
}

const TIU_SUBTYPES: readonly TiuSubtype[] = ['verbal', 'numerik', 'logika'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];

const isOptionId = (v: unknown): v is OptionId => typeof v === 'string' && (OPTION_IDS as readonly string[]).includes(v);

/** Pola teks yang merujuk ke opsi lain; soal seperti ini tidak boleh diacak opsinya. */
const OPTION_REFERENCE_PATTERNS: RegExp[] = [
  /\b(semua|seluruh)\s+(jawaban|pilihan|opsi|pernyataan)\b/i,
  /\b(jawaban|pilihan|opsi|pernyataan)\s+(di\s+atas|di\s+bawah)\b/i,
  /\b(opsi|pilihan|jawaban|pernyataan)\s+[A-E]\b/,
  /\b[A-E](\s*,\s*[A-E])*\s+(dan|atau)\s+[A-E]\b/,
  /^tidak\s+ada\s+(jawaban|pilihan|opsi)/i,
];

export function referencesOtherOptions(text: string): boolean {
  return OPTION_REFERENCE_PATTERNS.some((re) => re.test(text));
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Memvalidasi satu kandidat soal (sudah dinormalkan oleh loader) dan,
 * jika valid, mengembalikan objek Question bertipe.
 */
export function validateQuestion(candidate: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isRecord(candidate)) {
    return { question: null, errors: ['Soal bukan objek JSON.'], warnings };
  }
  const c = candidate;

  const id = str(c.id);
  if (!id) errors.push('Field "id" kosong atau tidak ada.');

  const category = str(c.category) as Category;
  if (!(CATEGORIES as readonly string[]).includes(category)) {
    errors.push(`"category" harus TWK, TIU, atau TKP (ditemukan: ${JSON.stringify(c.category)}).`);
  }

  const difficulty = str(c.difficulty) as Difficulty;
  if (!(DIFFICULTIES as readonly string[]).includes(difficulty)) {
    errors.push(`"difficulty" harus easy, medium, atau hard (ditemukan: ${JSON.stringify(c.difficulty)}).`);
  }

  const topic = str(c.topic);
  if (!topic) errors.push('Field "topic" kosong.');

  const questionText = str(c.question);
  if (!questionText) errors.push('Field "question" kosong.');

  const shuffleOptions = c.shuffleOptions !== false;
  const tags = strArray(c.tags);
  const extra = isRecord(c.extra) && Object.keys(c.extra).length > 0 ? c.extra : undefined;

  // ---- Opsi ----
  const rawOptions = Array.isArray(c.options) ? c.options : [];
  if (!Array.isArray(c.options)) errors.push('Field "options" harus berupa array.');
  if (rawOptions.length !== 5) errors.push(`Harus tepat 5 opsi (ditemukan ${rawOptions.length}).`);

  const seenIds = new Set<string>();
  const seenTexts = new Set<string>();
  const options: TkpOption[] = [];
  rawOptions.forEach((o, i) => {
    if (!isRecord(o)) {
      errors.push(`Opsi ke-${i + 1} bukan objek.`);
      return;
    }
    const oid = str(o.id).toUpperCase();
    const text = str(o.text);
    if (!isOptionId(oid)) errors.push(`Opsi ke-${i + 1}: id harus A–E (ditemukan: ${JSON.stringify(o.id)}).`);
    else if (seenIds.has(oid)) errors.push(`Opsi ${oid} muncul lebih dari sekali.`);
    seenIds.add(oid);
    if (!text) errors.push(`Opsi ${oid || i + 1}: teks kosong.`);
    else {
      const key = normalizeText(text);
      if (seenTexts.has(key)) errors.push(`Opsi ${oid}: teksnya kembar dengan opsi lain.`);
      seenTexts.add(key);
    }
    options.push({
      id: (isOptionId(oid) ? oid : 'A') as OptionId,
      text,
      score: typeof o.score === 'number' ? o.score : NaN,
      explanation: str(o.explanation),
    });
  });
  if (rawOptions.length === 5 && OPTION_IDS.some((x) => !seenIds.has(x))) {
    errors.push('Id opsi harus tepat A, B, C, D, dan E.');
  }

  // Urutkan opsi A–E agar data konsisten.
  options.sort((a, b) => a.id.localeCompare(b.id));

  if (shuffleOptions) {
    const offenders = [questionText, ...options.map((o) => o.text)].filter(referencesOtherOptions);
    if (offenders.length > 0) {
      errors.push(
        'Teks soal/opsi merujuk ke opsi lain (mis. "A dan B benar" atau "semua jawaban"), ' +
          'tetapi "shuffleOptions" tidak bernilai false.',
      );
    }
  }

  if (category === 'TKP') {
    const scores = options.map((o) => o.score);
    options.forEach((o) => {
      if (!Number.isInteger(o.score) || o.score < 1 || o.score > 5) {
        errors.push(`Opsi ${o.id}: "score" harus bilangan bulat 1–5.`);
      }
      if (!o.explanation) errors.push(`Opsi ${o.id}: "explanation" wajib diisi untuk TKP.`);
    });
    if (scores.length === 5 && new Set(scores).size !== 5) {
      errors.push('Skor TKP harus semuanya berbeda (tepat satu opsi untuk tiap nilai 1–5).');
    }
    const context = str(c.context);
    const competency = str(c.competency);
    const principle = str(c.principle);
    const whyBest = str(c.whyBest);
    const lesson = str(c.lesson);
    if (!context) warnings.push('TKP tanpa "context" (situasi kerja).');
    if (!competency) warnings.push('TKP tanpa "competency".');
    if (!principle) warnings.push('TKP tanpa "principle".');
    if (!whyBest) warnings.push('TKP tanpa "whyBest".');
    if (!lesson) warnings.push('TKP tanpa "lesson".');
    if (c.correctAnswer !== undefined) warnings.push('TKP tidak memakai "correctAnswer"; field diabaikan.');

    if (errors.length > 0) return { question: null, errors, warnings };
    const q: TkpQuestion = {
      id,
      category: 'TKP',
      topic,
      difficulty,
      context,
      question: questionText,
      options,
      competency,
      principle,
      whyBest,
      lesson,
      tags,
      shuffleOptions,
      ...(extra ? { extra } : {}),
    };
    return { question: q, errors, warnings };
  }

  // ---- TWK / TIU ----
  const correctAnswer = str(c.correctAnswer).toUpperCase();
  if (!isOptionId(correctAnswer)) {
    errors.push(`"correctAnswer" harus salah satu dari A–E (ditemukan: ${JSON.stringify(c.correctAnswer)}).`);
  }
  const explanation = str(c.explanation);
  if (!explanation) errors.push('Field "explanation" (pembahasan) wajib diisi.');

  const optionNotes: Partial<Record<OptionId, string>> = {};
  if (c.optionNotes !== undefined && !isRecord(c.optionNotes)) {
    errors.push('"optionNotes" harus berupa objek {"A": "…"}.');
  } else if (isRecord(c.optionNotes)) {
    for (const [k, v] of Object.entries(c.optionNotes)) {
      const key = k.toUpperCase();
      if (!isOptionId(key)) errors.push(`"optionNotes" punya kunci tidak dikenal: ${k}.`);
      else if (str(v)) optionNotes[key] = str(v);
    }
  }
  const wrongIds = OPTION_IDS.filter((x) => x !== correctAnswer);
  const missingNotes = wrongIds.filter((x) => !optionNotes[x]);
  if (isOptionId(correctAnswer) && missingNotes.length > 0) {
    warnings.push(`Tidak ada catatan "optionNotes" untuk opsi: ${missingNotes.join(', ')}.`);
  }

  const solutionSteps = strArray(c.solutionSteps);
  const shortcut = str(c.shortcut);
  const timeTip = str(c.timeTip);
  const reference = str(c.reference);
  const subtypeRaw = str(c.subtype).toLowerCase();
  let subtype: TiuSubtype | undefined;
  if (subtypeRaw) {
    if ((TIU_SUBTYPES as readonly string[]).includes(subtypeRaw)) subtype = subtypeRaw as TiuSubtype;
    else errors.push(`"subtype" harus verbal, numerik, atau logika (ditemukan: ${JSON.stringify(c.subtype)}).`);
  }

  if (category === 'TIU') {
    if (!subtype) warnings.push('TIU sebaiknya punya "subtype" (verbal/numerik/logika).');
    if (subtype === 'numerik') {
      if (solutionSteps.length === 0) warnings.push('TIU numerik tanpa "solutionSteps".');
      if (!shortcut) warnings.push('TIU numerik tanpa "shortcut" (Cara Cepat).');
      if (!timeTip) warnings.push('TIU numerik tanpa "timeTip".');
    }
  }
  if (category === 'TWK' && !reference) {
    warnings.push('TWK sebaiknya punya "reference" (dasar konstitusional/historis).');
  }

  if (errors.length > 0) return { question: null, errors, warnings };
  const q: ChoiceQuestion = {
    id,
    category: category as 'TWK' | 'TIU',
    topic,
    difficulty,
    question: questionText,
    options: options.map(({ id: oid, text }) => ({ id: oid, text })),
    correctAnswer: correctAnswer as OptionId,
    explanation,
    optionNotes,
    solutionSteps,
    shortcut,
    timeTip,
    tags,
    shuffleOptions,
    ...(reference ? { reference } : {}),
    ...(subtype ? { subtype } : {}),
    ...(extra ? { extra } : {}),
  };
  return { question: q, errors, warnings };
}

// ---------- Pemeriksaan tingkat bank soal ----------

export interface BankIssue {
  level: 'error' | 'warning';
  ids: string[];
  message: string;
}

function tokenSet(q: Question): Set<string> {
  const base = q.category === 'TKP' ? `${q.context} ${q.question} ${q.options.map((o) => o.text).join(' ')}` : `${q.question} ${q.options.map((o) => o.text).join(' ')}`;
  return new Set(normalizeText(base).split(' ').filter((w) => w.length > 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const SIMILARITY_THRESHOLD = 0.8;

/** Mencari ID ganda, teks soal ganda, dan soal yang sangat mirip. */
export function findBankIssues(questions: Question[]): BankIssue[] {
  const issues: BankIssue[] = [];

  const byId = new Map<string, number>();
  for (const q of questions) byId.set(q.id, (byId.get(q.id) ?? 0) + 1);
  for (const [id, n] of byId) {
    if (n > 1) issues.push({ level: 'error', ids: [id], message: `ID "${id}" dipakai ${n} kali.` });
  }

  const byText = new Map<string, string[]>();
  for (const q of questions) {
    const key = normalizeText(q.category === 'TKP' ? `${q.context} ${q.question}` : q.question);
    byText.set(key, [...(byText.get(key) ?? []), q.id]);
  }
  for (const ids of byText.values()) {
    if (ids.length > 1) issues.push({ level: 'error', ids, message: `Teks soal ganda: ${ids.join(', ')}.` });
  }

  const sets = questions.map(tokenSet);
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const qi = questions[i]!;
      const qj = questions[j]!;
      if (qi.category !== qj.category) continue;
      const sim = jaccard(sets[i]!, sets[j]!);
      if (sim >= SIMILARITY_THRESHOLD && sim < 1) {
        issues.push({
          level: 'warning',
          ids: [qi.id, qj.id],
          message: `Soal ${qi.id} dan ${qj.id} sangat mirip (kemiripan ${(sim * 100).toFixed(0)}%).`,
        });
      }
    }
  }
  return issues;
}

export interface BankStats {
  total: number;
  byCategory: Record<string, number>;
  byTopic: Record<string, number>;
  byDifficulty: Record<string, number>;
  /** Sebaran huruf jawaban benar TWK/TIU. */
  answerLetters: Record<OptionId, number>;
  /** Sebaran posisi opsi ber-skor 5 pada TKP. */
  tkpTopPositions: Record<OptionId, number>;
}

const emptyLetters = (): Record<OptionId, number> => ({ A: 0, B: 0, C: 0, D: 0, E: 0 });

export function bankStats(questions: Question[]): BankStats {
  const stats: BankStats = {
    total: questions.length,
    byCategory: {},
    byTopic: {},
    byDifficulty: {},
    answerLetters: emptyLetters(),
    tkpTopPositions: emptyLetters(),
  };
  for (const q of questions) {
    stats.byCategory[q.category] = (stats.byCategory[q.category] ?? 0) + 1;
    const tk = `${q.category} · ${q.topic}`;
    stats.byTopic[tk] = (stats.byTopic[tk] ?? 0) + 1;
    const dk = `${q.category} · ${q.difficulty}`;
    stats.byDifficulty[dk] = (stats.byDifficulty[dk] ?? 0) + 1;
    if (q.category === 'TKP') {
      const top = q.options.find((o) => o.score === 5);
      if (top) stats.tkpTopPositions[top.id]++;
    } else {
      stats.answerLetters[q.correctAnswer]++;
    }
  }
  return stats;
}
