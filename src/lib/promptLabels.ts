// Catatan "awalan ID prompt AI → nama set" per pengguna, disimpan di localStorage.
// Dibuat saat tombol Salin Prompt ditekan; dipakai untuk memberi nama yang mudah dibaca
// ketika soal dengan awalan itu diunggah/ditempel.
import type { CategoryFilter, Difficulty } from '../types';
import { getStorage } from './storage';

const MAX_ENTRIES = 50;
const key = (owner: string) => `skd-cpns:${owner}:prompt-labels`;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DIFF: Record<Difficulty, string> = { easy: 'Mudah', medium: 'Sedang', hard: 'Sulit' };

/** Nama set yang mudah dibaca, mis. "TIU · Deret angka · Sulit · 25 Nov 19.00". */
export function makeBatchLabel(
  o: { category: CategoryFilter; topic: string | 'ALL'; difficulty: Difficulty | 'ALL' },
  date: Date = new Date(),
): string {
  const parts = [o.category === 'MIX' ? 'Campuran' : o.category];
  if (o.category !== 'MIX' && o.topic !== 'ALL') parts.push(o.topic);
  if (o.difficulty !== 'ALL') parts.push(DIFF[o.difficulty]);
  const pad = (n: number) => String(n).padStart(2, '0');
  parts.push(`${date.getDate()} ${MONTHS[date.getMonth()]} ${pad(date.getHours())}.${pad(date.getMinutes())}`);
  return parts.join(' · ');
}

export function readPromptLabels(owner: string): Record<string, string> {
  try {
    const raw: unknown = JSON.parse(getStorage()?.getItem(key(owner)) ?? '[]');
    if (!Array.isArray(raw)) return {};
    const out: Record<string, string> = {};
    for (const e of raw) if (Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'string') out[e[0]] = e[1];
    return out;
  } catch {
    return {};
  }
}

export function rememberPromptLabel(owner: string, prefix: string, label: string): void {
  const s = getStorage();
  if (!s) return;
  try {
    const entries = Object.entries(readPromptLabels(owner)).filter(([p]) => p !== prefix);
    entries.push([prefix, label]);
    s.setItem(key(owner), JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    /* abaikan: nama tampilan hanya pelengkap */
  }
}
