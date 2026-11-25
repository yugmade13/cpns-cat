import type { Category, CategoryFilter, Difficulty, Question } from '../types';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
};

export const CATEGORY_FILTER_LABEL: Record<CategoryFilter, string> = {
  TWK: 'TWK',
  TIU: 'TIU',
  TKP: 'TKP',
  MIX: 'Campuran',
};

export const CATEGORY_DESCRIPTION: Record<CategoryFilter, string> = {
  TWK: 'Tes Wawasan Kebangsaan',
  TIU: 'Tes Intelegensia Umum',
  TKP: 'Tes Karakteristik Pribadi',
  MIX: 'Gabungan TWK, TIU, dan TKP',
};

export const CATEGORY_NAME: Record<Category, string> = {
  TWK: 'Tes Wawasan Kebangsaan',
  TIU: 'Tes Intelegensia Umum',
  TKP: 'Tes Karakteristik Pribadi',
};

export function subtypeLabel(q: Question): string | null {
  if (q.category !== 'TIU' || !q.subtype) return null;
  return { verbal: 'Verbal', numerik: 'Numerik', logika: 'Logika' }[q.subtype];
}
