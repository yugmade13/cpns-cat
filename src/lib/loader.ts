// Memuat file JSON soal, menormalkan alias field, dan memvalidasi setiap soal.
import { OPTION_IDS, type Question } from '../types';
import { validateQuestion } from './validate';

export const DATA_FILES = ['twk.json', 'tiu.json', 'tkp.json'] as const;

/** Field yang dikenali (format baku). Field lain disimpan ke `extra`. */
const KNOWN_FIELDS = new Set([
  'id',
  'category',
  'topic',
  'difficulty',
  'question',
  'context',
  'options',
  'correctAnswer',
  'explanation',
  'optionNotes',
  'solutionSteps',
  'shortcut',
  'timeTip',
  'reference',
  'subtype',
  'competency',
  'principle',
  'whyBest',
  'lesson',
  'tags',
  'shuffleOptions',
  'extra',
]);

/** Alias field (mis. dari bank soal berbahasa Indonesia) → nama field baku. */
const FIELD_ALIASES: Record<string, string> = {
  pertanyaan: 'question',
  soal: 'question',
  jawaban_benar: 'correctAnswer',
  jawabanBenar: 'correctAnswer',
  kunci: 'correctAnswer',
  kunci_jawaban: 'correctAnswer',
  pembahasan: 'explanation',
  kategori: 'category',
  topik: 'topic',
  kesulitan: 'difficulty',
  tingkat_kesulitan: 'difficulty',
  opsi: 'options',
  pilihan: 'options',
  konteks: 'context',
  situasi: 'context',
  langkah: 'solutionSteps',
  cara_cepat: 'shortcut',
  tips: 'timeTip',
  dasar: 'reference',
  kompetensi: 'competency',
  prinsip: 'principle',
  alasan_terbaik: 'whyBest',
  pelajaran: 'lesson',
  acak_opsi: 'shuffleOptions',
};

const DIFFICULTY_ALIASES: Record<string, string> = {
  mudah: 'easy',
  sedang: 'medium',
  sulit: 'hard',
  susah: 'hard',
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function normalizeOption(raw: unknown, fallbackId: string): unknown {
  if (typeof raw === 'string') return { id: fallbackId, text: raw };
  if (!isRecord(raw)) return raw;
  const o: Record<string, unknown> = { ...raw };
  if (o.text === undefined && o.teks !== undefined) o.text = o.teks;
  if (o.score === undefined && o.skor !== undefined) o.score = o.skor;
  if (o.explanation === undefined) o.explanation = o.pembahasan ?? o.alasan;
  if (o.id === undefined) o.id = fallbackId;
  if (typeof o.id === 'string') o.id = o.id.trim().toUpperCase();
  if (typeof o.score === 'string' && o.score.trim() !== '') o.score = Number(o.score);
  delete o.teks;
  delete o.skor;
  delete o.pembahasan;
  delete o.alasan;
  if (o.explanation === undefined) delete o.explanation;
  return o;
}

/**
 * Menormalkan satu soal mentah ke bentuk baku (belum divalidasi).
 * - Alias field dipetakan ke nama baku.
 * - Opsi berbentuk objek {A: "…", B: "…"} diubah menjadi array.
 * - Field tak dikenal dipindah ke `extra`.
 */
export function normalizeRaw(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const out: Record<string, unknown> = {};
  const extra: Record<string, unknown> = isRecord(raw.extra) ? { ...raw.extra } : {};

  for (const [key, value] of Object.entries(raw)) {
    if (key === 'extra') continue;
    const target = KNOWN_FIELDS.has(key) ? key : FIELD_ALIASES[key];
    if (target && out[target] === undefined) out[target] = value;
    else if (!target) extra[key] = value;
  }

  if (typeof out.category === 'string') out.category = out.category.trim().toUpperCase();
  if (typeof out.difficulty === 'string') {
    const d = out.difficulty.trim().toLowerCase();
    out.difficulty = DIFFICULTY_ALIASES[d] ?? d;
  }
  if (typeof out.correctAnswer === 'string') out.correctAnswer = out.correctAnswer.trim().toUpperCase();

  if (isRecord(out.options)) {
    // Bentuk {A: "…", B: "…"} atau {A: {text, score}}.
    const obj = out.options;
    out.options = OPTION_IDS.filter((k) => k in obj).map((k) => {
      const v = obj[k];
      return isRecord(v) ? normalizeOption({ ...v, id: k }, k) : normalizeOption(v, k);
    });
  } else if (Array.isArray(out.options)) {
    out.options = out.options.map((o, i) => normalizeOption(o, OPTION_IDS[i] ?? String(i + 1)));
  }

  if (typeof out.solutionSteps === 'string') {
    out.solutionSteps = out.solutionSteps.split('\n').filter((s) => s.trim() !== '');
  }
  if (typeof out.tags === 'string') out.tags = out.tags.split(',').map((s) => s.trim());
  if (Object.keys(extra).length > 0) out.extra = extra;
  return out;
}

export interface RejectedQuestion {
  source: string;
  id: string;
  errors: string[];
}

export interface ParseResult {
  questions: Question[];
  rejected: RejectedQuestion[];
  warnings: { source: string; id: string; warnings: string[] }[];
}

/**
 * Mengurai isi satu file/unggahan. Menerima array soal, atau objek
 * dengan field `questions`/`soal` berisi array.
 */
export function parseQuestions(data: unknown, source: string, existingIds: Set<string> = new Set()): ParseResult {
  const result: ParseResult = { questions: [], rejected: [], warnings: [] };
  let list: unknown[];
  if (Array.isArray(data)) list = data;
  else if (isRecord(data) && Array.isArray(data.questions)) list = data.questions;
  else if (isRecord(data) && Array.isArray(data.soal)) list = data.soal;
  else {
    result.rejected.push({ source, id: '(berkas)', errors: ['Isi berkas harus berupa array soal.'] });
    return result;
  }

  const ids = new Set(existingIds);
  list.forEach((raw, i) => {
    const normalized = normalizeRaw(raw);
    const { question, errors, warnings } = validateQuestion(normalized);
    const id =
      question?.id ?? (isRecord(normalized) && typeof normalized.id === 'string' && normalized.id ? normalized.id : `#${i + 1}`);
    if (!question) {
      result.rejected.push({ source, id, errors });
      return;
    }
    if (ids.has(question.id)) {
      result.rejected.push({ source, id, errors: [`ID "${question.id}" sudah dipakai soal lain.`] });
      return;
    }
    ids.add(question.id);
    result.questions.push(question);
    if (warnings.length > 0) result.warnings.push({ source, id, warnings });
  });
  return result;
}

export function logRejected(rejected: RejectedQuestion[]): void {
  for (const r of rejected) {
    console.warn(`[Bank soal] Soal "${r.id}" (${r.source}) dilewati: ${r.errors.join(' ')}`);
  }
}

/** Memuat seluruh file soal bawaan dari public/data. Melempar error jika ada berkas gagal dimuat. */
export async function loadBank(baseUrl: string = import.meta.env.BASE_URL): Promise<ParseResult> {
  const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const responses = await Promise.all(
    DATA_FILES.map(async (file) => {
      const res = await fetch(`${prefix}data/${file}`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Berkas ${file} gagal dimuat (HTTP ${res.status}).`);
      try {
        return { file, data: (await res.json()) as unknown };
      } catch {
        throw new Error(`Berkas ${file} bukan JSON yang valid.`);
      }
    }),
  );

  const merged: ParseResult = { questions: [], rejected: [], warnings: [] };
  const ids = new Set<string>();
  for (const { file, data } of responses) {
    const r = parseQuestions(data, file, ids);
    r.questions.forEach((q) => ids.add(q.id));
    merged.questions.push(...r.questions);
    merged.rejected.push(...r.rejected);
    merged.warnings.push(...r.warnings);
  }
  logRejected(merged.rejected);
  return merged;
}

/** Mengubah soal ke bentuk JSON baku untuk diekspor (termasuk field `extra`). */
export function toExportJson(questions: Question[]): string {
  return JSON.stringify(questions, null, 2);
}
