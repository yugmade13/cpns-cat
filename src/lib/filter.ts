import type { Question, SessionConfig } from '../types';

export interface StoredLists {
  bookmarks: string[];
  wrong: string[];
}

/** Soal sesuai sumber (semua/bookmark/pernah salah) dan kategori, tanpa filter topik & kesulitan. */
export function bySourceAndCategory(
  bank: Question[],
  config: Pick<SessionConfig, 'source' | 'category'>,
  stored: StoredLists,
): Question[] {
  let list = bank;
  if (config.source === 'bookmark') {
    const set = new Set(stored.bookmarks);
    list = list.filter((q) => set.has(q.id));
  } else if (config.source === 'wrong') {
    const set = new Set(stored.wrong);
    list = list.filter((q) => set.has(q.id));
  }
  if (config.category !== 'MIX') list = list.filter((q) => q.category === config.category);
  return list;
}

export function filterQuestions(bank: Question[], config: SessionConfig, stored: StoredLists): Question[] {
  return bySourceAndCategory(bank, config, stored).filter(
    (q) =>
      (config.topic === 'ALL' || q.topic === config.topic) &&
      (config.difficulty === 'ALL' || q.difficulty === config.difficulty),
  );
}

/** Daftar topik unik (urut abjad); untuk Campuran diberi awalan kategori. */
export function topicOptions(questions: Question[]): { value: string; label: string }[] {
  const map = new Map<string, string>();
  for (const q of questions) if (!map.has(q.topic)) map.set(q.topic, q.category);
  return [...map.entries()]
    .sort(([a, ca], [b, cb]) => ca.localeCompare(cb) || a.localeCompare(b, 'id'))
    .map(([topic, cat]) => ({ value: topic, label: `${topic} (${cat})` }));
}

export function requestedCount(config: SessionConfig, available: number): number {
  return config.count === 'ALL' ? available : config.count;
}
