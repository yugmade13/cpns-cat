// Logika murni untuk bank soal berbasis file unggahan:
// menyiapkan impor (validasi + cek ID ganda + deteksi penggantian) dan menerapkannya.
import type { Category, Question } from '../types';
import { parseQuestions, type RejectedQuestion } from './loader';

export interface BankFile {
  /** Nama file; menjadi kunci. Mengunggah nama yang sama = mengganti versi lama. */
  name: string;
  uploadedAt: number;
  questions: Question[];
}

/** Hasil membaca satu file: data JSON, atau pesan fatal jika gagal dibaca/diurai. */
export interface ParsedUpload {
  name: string;
  data?: unknown;
  fatal: string | null;
}

export interface PreparedFile {
  name: string;
  questions: Question[];
  rejected: RejectedQuestion[];
  fatal: string | null;
  /** true jika file dengan nama sama sudah ada dan akan diganti. */
  replaces: boolean;
}

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/**
 * Membuang pembungkus blok kode Markdown (```json … ```) yang sering ikut tersalin dari jawaban AI,
 * serta BOM di awal file.
 */
function stripCodeFence(text: string): string {
  const t = text.replace(/^\uFEFF/, '').trim();
  const m = /^```[a-zA-Z]*\s*\n([\s\S]*?)\n?```\s*$/.exec(t);
  return m ? m[1]! : t;
}

/** Mengurai teks file menjadi ParsedUpload tanpa pernah melempar error. */
export function parseUploadText(name: string, text: string): ParsedUpload {
  if (text.trim() === '') return { name, fatal: 'Teksnya kosong.' };
  for (const candidate of jsonCandidates(text)) {
    try {
      return { name, data: JSON.parse(candidate) as unknown, fatal: null };
    } catch {
      /* coba kandidat berikutnya */
    }
  }
  return { name, fatal: 'Isinya bukan JSON yang valid. Periksa tanda koma, kutip, dan kurung, atau pastikan jawaban AI tersalin utuh.' };
}

/**
 * Kandidat teks JSON dari isi file atau teks tempelan, dari yang paling ketat:
 * 1) teks apa adanya (tanpa pembungkus blok kode), 2) isi blok kode ```json di mana pun dalam teks
 * (mis. jawaban AI yang ikut tersalin dengan kalimat pembuka), 3) potongan dari "[" pertama sampai "]" terakhir.
 */
function jsonCandidates(text: string): string[] {
  const out = [stripCodeFence(text)];
  for (const m of text.matchAll(/```[a-zA-Z]*\s*\n([\s\S]*?)```/g)) out.push(m[1]!.trim());
  const first = text.indexOf('[');
  const last = text.lastIndexOf(']');
  if (first >= 0 && last > first) out.push(text.slice(first, last + 1));
  return [...new Set(out)];
}

/** Nama file untuk teks yang ditempel: memakai awalan ID dari prompt AI bila ada, agar tempelan ulang batch yang sama menggantikannya. */
export function pastedFileName(data: unknown, now: Date = new Date()): string {
  const list = Array.isArray(data) ? data : [];
  const first = list.find((q): q is { id: string } => typeof q === 'object' && q !== null && typeof (q as { id?: unknown }).id === 'string');
  const m = first ? /^(ai\w+?)-(twk|tiu|tkp)-\d+$/i.exec(first.id) : null;
  if (m) return `${m[1]}.json`;
  const p = (n: number) => String(n).padStart(2, '0');
  return `tempelan-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.json`;
}

/**
 * Memvalidasi file-file unggahan terhadap bank yang sudah ada.
 * - ID harus unik di seluruh bank (file yang akan diganti tidak ikut dihitung).
 * - Jika nama file yang sama dipilih dua kali dalam satu unggahan, yang terakhir dipakai.
 */
export function prepareImport(existing: BankFile[], uploads: ParsedUpload[]): PreparedFile[] {
  const lastByName = new Map<string, ParsedUpload>();
  for (const u of uploads) lastByName.set(u.name, u);
  const batch = [...lastByName.values()];
  const batchNames = new Set(batch.filter((u) => !u.fatal).map((u) => u.name));

  const ids = new Set<string>();
  for (const f of existing) {
    if (batchNames.has(f.name)) continue;
    for (const q of f.questions) ids.add(q.id);
  }

  return batch.map((u) => {
    const replaces = existing.some((f) => f.name === u.name);
    if (u.fatal) return { name: u.name, questions: [], rejected: [], fatal: u.fatal, replaces: false };
    const r = parseQuestions(u.data, u.name, ids);
    r.questions.forEach((q) => ids.add(q.id));
    const fatal =
      r.questions.length === 0 && r.rejected.length === 0
        ? 'File tidak berisi soal.'
        : r.questions.length === 0 && r.rejected.length === 1 && r.rejected[0]!.id === '(berkas)'
          ? r.rejected[0]!.errors.join(' ')
          : null;
    return {
      name: u.name,
      questions: r.questions,
      rejected: fatal ? [] : r.rejected,
      fatal,
      replaces: replaces && r.questions.length > 0,
    };
  });
}

/** Menerapkan hasil persiapan: file tanpa soal valid diabaikan (versi lama tetap dipakai). */
export function applyImport(existing: BankFile[], prepared: PreparedFile[], now: number = Date.now()): BankFile[] {
  const next = [...existing];
  for (const p of prepared) {
    if (p.questions.length === 0) continue;
    const file: BankFile = { name: p.name, uploadedAt: now, questions: p.questions };
    const i = next.findIndex((f) => f.name === p.name);
    if (i >= 0) next[i] = file;
    else next.push(file);
  }
  return next;
}

export function countByCategory(questions: Question[]): Record<Category, number> {
  const out: Record<Category, number> = { TWK: 0, TIU: 0, TKP: 0 };
  for (const q of questions) out[q.category]++;
  return out;
}

export function describeCounts(questions: Question[]): string {
  const c = countByCategory(questions);
  return (Object.keys(c) as Category[])
    .filter((k) => c[k] > 0)
    .map((k) => `${k} ${c[k]}`)
    .join(' · ');
}
