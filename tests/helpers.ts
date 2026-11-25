import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseQuestions } from '../src/lib/loader';
import type { ChoiceQuestion, Question, TkpQuestion } from '../src/types';

export function loadFile(name: string): Question[] {
  const data: unknown = JSON.parse(readFileSync(resolve(__dirname, '../public/data', name), 'utf8'));
  const r = parseQuestions(data, name);
  if (r.rejected.length > 0) throw new Error(`Soal ditolak di ${name}: ${JSON.stringify(r.rejected)}`);
  return r.questions;
}

export function loadAll(): Question[] {
  return ['twk.json', 'tiu.json', 'tkp.json'].flatMap(loadFile);
}

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
