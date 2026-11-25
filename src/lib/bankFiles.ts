// Logika murni untuk bank soal berbasis file unggahan:
// menyiapkan impor (validasi + cek ID ganda + deteksi penggantian/penambahan) dan menerapkannya.
import type { Category, Question } from '../types';
import { parseQuestions, type RejectedQuestion } from './loader';

export interface BankFile {
  /** Nama file; menjadi kunci. Mengunggah nama yang sama = mengganti versi lama. */
  name: string;
  /** Nama tampilan (dari prompt AI atau diganti pengguna). Bila kosong, dipakai nama file tanpa ".json". */
  label?: string;
  uploadedAt: number;
  questions: Question[];
}

/** Nama yang ditampilkan untuk sebuah set soal. */
export const displayName = (f: { name: string; label?: string }) => f.label?.trim() || f.name.replace(/\.json$/i, '');

/** Hasil membaca satu file: data JSON, atau pesan fatal jika gagal dibaca/diurai. */
export interface ParsedUpload {
  name: string;
  data?: unknown;
  fatal: string | null;
  /** true jika JSON terpotong (mis. jawaban AI berhenti di tengah) dan hanya soal yang lengkap yang diambil. */
  truncated?: boolean;
  /**
   * Untuk teks tempelan: bila nama set sudah ada dan semua ID-nya baru, soal DITAMBAHKAN ke set itu
   * (lanjutan jawaban AI yang terpotong), bukan menggantinya.
   */
  appendIfNew?: boolean;
}

export interface PreparedFile {
  name: string;
  /** Nama tampilan untuk set ini (diisi useBank dari catatan prompt AI). */
  label?: string;
  questions: Question[];
  rejected: RejectedQuestion[];
  fatal: string | null;
  /** true jika file dengan nama sama sudah ada dan akan diganti. */
  replaces: boolean;
  /** true jika soal akan ditambahkan ke set yang sudah ada (lanjutan). */
  appends: boolean;
  /** true jika sumbernya JSON terpotong. */
  truncated: boolean;
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
  // Jawaban AI yang terpotong di tengah: ambil soal-soal yang sudah lengkap.
  const salvaged = salvageTruncatedArray(text);
  if (salvaged) {
    try {
      return { name, data: JSON.parse(salvaged.json) as unknown, fatal: null, truncated: true };
    } catch {
      /* tidak bisa diselamatkan */
    }
  }
  return { name, fatal: 'Isinya bukan JSON yang valid. Periksa tanda koma, kutip, dan kurung, atau pastikan jawaban AI tersalin utuh.' };
}

/**
 * Menyelamatkan array JSON yang terpotong: mengambil elemen tingkat atas (objek soal) yang sudah
 * ditutup lengkap, lalu menutup array-nya. Tanda kurung di dalam string diabaikan.
 * Mengembalikan null bila tidak ada array, tidak ada elemen lengkap, atau array sebenarnya sudah tertutup.
 */
export function salvageTruncatedArray(text: string): { json: string; count: number } | null {
  const start = text.indexOf('[');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastEnd = -1;
  let count = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return null; // array tertutup: bukan kasus terpotong
      if (depth === 1 && ch === '}') {
        lastEnd = i;
        count++;
      }
    }
  }
  if (lastEnd < 0) return null;
  return { json: `${text.slice(start, lastEnd + 1)}]`, count };
}

/**
 * Kandidat teks JSON dari isi file (mis. jawaban AI yang disimpan apa adanya), dari yang paling ketat:
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

const AI_ID = /^(ai\w+?)-(twk|tiu|tkp)-\d+$/i;

/** ID mentah dari data JSON (sebelum validasi). */
function rawIds(data: unknown): string[] {
  const list = Array.isArray(data) ? data : [];
  return list
    .map((q) => (typeof q === 'object' && q !== null ? (q as { id?: unknown }).id : undefined))
    .filter((id): id is string => typeof id === 'string' && id.trim() !== '')
    .map((id) => id.trim());
}

/** Awalan ID dari prompt AI (mis. "ai2611251900xy") bila soal-soal memakainya. */
export function aiPrefixOf(ids: readonly string[]): string | null {
  for (const id of ids) {
    const m = AI_ID.exec(id);
    if (m) return m[1]!;
  }
  return null;
}

/** Nama file untuk teks yang ditempel: memakai awalan ID dari prompt AI bila ada, agar tempelan ulang batch yang sama menggantikannya. */
export function pastedFileName(data: unknown, now: Date = new Date()): string {
  const prefix = aiPrefixOf(rawIds(data));
  if (prefix) return `${prefix}.json`;
  const p = (n: number) => String(n).padStart(2, '0');
  return `tempelan-${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.json`;
}

/**
 * Memvalidasi file-file unggahan terhadap bank yang sudah ada.
 * - ID harus unik di seluruh bank (file yang akan diganti tidak ikut dihitung).
 * - Jika nama file yang sama dipilih dua kali dalam satu unggahan, yang terakhir dipakai.
 * - Lanjutan jawaban AI DITAMBAHKAN ke set yang sudah ada (bukan menggantinya) bila semua ID-nya baru dan:
 *   a) teks tempelan (appendIfNew) dengan nama set yang sama, atau
 *   b) soal hasil prompt aplikasi (ID berawalan "ai…") yang awalannya sama dengan set yang sudah ada —
 *      termasuk beberapa file "…-bagian-N.json" yang diunggah sekaligus.
 */
export function prepareImport(existing: BankFile[], uploads: ParsedUpload[]): PreparedFile[] {
  const lastByName = new Map<string, ParsedUpload>();
  for (const u of uploads) lastByName.set(u.name, u);
  const batch = [...lastByName.values()];

  // Rencana tiap unggahan: nama set tujuan & apakah ditambahkan (append) atau dibuat/diganti.
  const prefixTarget = new Map<string, string>(); // awalan ID prompt → nama set
  const setIds = new Map<string, Set<string>>(); // nama set → ID yang sudah ada di dalamnya
  for (const f of existing) {
    const px = aiPrefixOf(f.questions.map((q) => q.id));
    if (px && !prefixTarget.has(px)) prefixTarget.set(px, f.name);
    setIds.set(f.name, new Set(f.questions.map((q) => q.id)));
  }
  const plans = batch.map((u) => {
    if (u.fatal) return { u, name: u.name, append: false };
    const incoming = rawIds(u.data);
    const px = aiPrefixOf(incoming);
    const target = u.appendIfNew && setIds.has(u.name) ? u.name : px ? prefixTarget.get(px) : undefined;
    const targetIds = target ? setIds.get(target) : undefined;
    if (target && targetIds && incoming.length > 0 && incoming.every((id) => !targetIds.has(id))) {
      incoming.forEach((id) => targetIds.add(id));
      return { u, name: target, append: true };
    }
    if (px && !prefixTarget.has(px)) prefixTarget.set(px, u.name);
    setIds.set(u.name, new Set(incoming));
    return { u, name: u.name, append: false };
  });

  // Set yang akan DIGANTI: ID versi lamanya tidak dihitung bentrok.
  const replaceNames = new Set(plans.filter((pl) => !pl.u.fatal && !pl.append).map((pl) => pl.name));
  const ids = new Set<string>();
  for (const f of existing) {
    if (replaceNames.has(f.name)) continue;
    for (const q of f.questions) ids.add(q.id);
  }

  return plans.map(({ u, name, append }) => {
    const exists = existing.some((f) => f.name === name);
    const truncated = u.truncated === true;
    if (u.fatal) return { name, questions: [], rejected: [], fatal: u.fatal, replaces: false, appends: false, truncated };
    const r = parseQuestions(u.data, u.name, ids);
    r.questions.forEach((q) => ids.add(q.id));
    const fatal =
      r.questions.length === 0 && r.rejected.length === 0
        ? 'File tidak berisi soal.'
        : r.questions.length === 0 && r.rejected.length === 1 && r.rejected[0]!.id === '(berkas)'
          ? r.rejected[0]!.errors.join(' ')
          : null;
    return {
      name,
      questions: r.questions,
      rejected: fatal ? [] : r.rejected,
      fatal,
      replaces: exists && !append && r.questions.length > 0,
      appends: append && r.questions.length > 0,
      truncated,
    };
  });
}

/** Menerapkan hasil persiapan: file tanpa soal valid diabaikan (versi lama tetap dipakai). */
export function applyImport(existing: BankFile[], prepared: PreparedFile[], now: number = Date.now()): BankFile[] {
  const next = [...existing];
  for (const p of prepared) {
    if (p.questions.length === 0) continue;
    const i = next.findIndex((f) => f.name === p.name);
    const old = i >= 0 ? next[i]! : undefined;
    // Nama tampilan: pertahankan yang sudah ada (mis. hasil ganti nama), selain itu pakai label dari prompt.
    const label = old?.label ?? p.label;
    const file: BankFile = {
      name: p.name,
      ...(label ? { label } : {}),
      uploadedAt: now,
      questions: p.appends && old ? [...old.questions, ...p.questions] : p.questions,
    };
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
