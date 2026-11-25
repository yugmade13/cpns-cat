import { describe, expect, it } from 'vitest';
import { evaluateAnswer, summarizeSession, topicAdvice } from '../src/lib/scoring';
import { buildSessionQuestion } from '../src/lib/shuffle';
import { quizReducer } from '../src/hooks/useQuizSession';
import type { AnswerRecord, OptionId } from '../src/types';
import { makeChoice, makeTkp } from './helpers';

const ans = (id: OptionId | null): AnswerRecord => ({ selectedOriginalId: id });

describe('evaluateAnswer', () => {
  const choice = buildSessionQuestion(makeChoice());
  const tkp = buildSessionQuestion(makeTkp());

  it('TWK/TIU: benar = 5 poin, salah = 0, tidak terjawab = 0', () => {
    expect(evaluateAnswer(choice, ans('B'))).toMatchObject({ status: 'correct', points: 5, needsReview: false });
    expect(evaluateAnswer(choice, ans('A'))).toMatchObject({ status: 'wrong', points: 0, needsReview: true });
    expect(evaluateAnswer(choice, ans(null))).toMatchObject({ status: 'unanswered', points: 0, needsReview: true });
    expect(evaluateAnswer(choice, null)).toMatchObject({ status: 'unanswered' });
  });

  it('TKP: poin = skor opsi; perlu diulang jika < 4', () => {
    expect(evaluateAnswer(tkp, ans('B'))).toMatchObject({ status: 'scored', points: 5, needsReview: false });
    expect(evaluateAnswer(tkp, ans('D'))).toMatchObject({ points: 4, needsReview: false });
    expect(evaluateAnswer(tkp, ans('A'))).toMatchObject({ points: 3, needsReview: true });
    expect(evaluateAnswer(tkp, ans('C'))).toMatchObject({ points: 1, needsReview: true });
    expect(evaluateAnswer(tkp, ans(null))).toMatchObject({ status: 'unanswered', points: 0, needsReview: true });
  });
});

describe('summarizeSession', () => {
  it('menghitung rincian per kategori, topik lemah, dan daftar ulang', () => {
    const qs = [
      buildSessionQuestion(makeChoice({ id: 'w1', category: 'TWK', topic: 'Pancasila' })),
      buildSessionQuestion(makeChoice({ id: 'w2', category: 'TWK', topic: 'Pancasila' })),
      buildSessionQuestion(makeChoice({ id: 'w3', category: 'TWK', topic: 'UUD 1945' })),
      buildSessionQuestion(makeChoice({ id: 'i1', category: 'TIU', topic: 'Deret angka' })),
      buildSessionQuestion(makeTkp({ id: 'k1', topic: 'Integritas' })),
      buildSessionQuestion(makeTkp({ id: 'k2', topic: 'Integritas' })),
    ];
    const answers = [ans('A'), ans(null), ans('B'), ans('B'), ans('B'), ans('E')];
    const s = summarizeSession(qs, answers);

    expect(s.categories.map((c) => c.category)).toEqual(['TWK', 'TIU', 'TKP']);
    expect(s.categories[0]).toMatchObject({ correct: 1, wrong: 1, unanswered: 1, score: 5, maxScore: 15, percent: 33 });
    expect(s.categories[1]).toMatchObject({ correct: 1, wrong: 0, score: 5, percent: 100 });
    expect(s.categories[2]).toMatchObject({ kind: 'tkp', score: 7, maxScore: 10, average: 3.5, answered: 2 });
    expect(s.totalScore).toBe(17);
    expect(s.maxScore).toBe(30);
    expect(s.reviewIds).toEqual(['w1', 'w2', 'k2']);
    expect(s.weakTopics[0]).toMatchObject({ topic: 'Pancasila', missed: 2, total: 2 });
    expect(s.weakTopics.map((t) => t.topic)).toEqual(['Pancasila', 'Integritas']);
  });

  it('sesi sempurna tidak punya soal untuk diulang', () => {
    const qs = [buildSessionQuestion(makeChoice()), buildSessionQuestion(makeTkp())];
    const s = summarizeSession(qs, [ans('B'), ans('D')]);
    expect(s.reviewIds).toEqual([]);
    expect(s.weakTopics).toEqual([]);
  });

  it('memberi saran topik dalam bahasa Indonesia', () => {
    expect(topicAdvice({ category: 'TIU', topic: 'Deret angka', missed: 2, total: 3 })).toContain(
      'Coba latihan 10 soal Deret angka',
    );
  });
});

describe('timer total sesi (quizReducer)', () => {
  const qs = [buildSessionQuestion(makeChoice({ id: 'a' })), buildSessionQuestion(makeChoice({ id: 'b' })), buildSessionQuestion(makeTkp({ id: 'c' }))];
  const config = { timer: 30 } as const;

  it('batas waktu = waktu mulai + menit timer; tanpa timer = null', () => {
    const s = quizReducer(null, { type: 'start', config, title: 't', questions: qs, now: 1_000 })!;
    expect(s.deadline).toBe(1_000 + 30 * 60_000);
    const s0 = quizReducer(null, { type: 'start', config: { ...config, timer: 0 }, title: 't', questions: qs, now: 1_000 })!;
    expect(s0.deadline).toBeNull();
  });

  it('waktu habis: soal belum dijawab jadi tidak terjawab, jawaban yang ada tetap, sesi selesai', () => {
    let s = quizReducer(null, { type: 'start', config, title: 't', questions: qs, now: 0 });
    s = quizReducer(s, { type: 'answer', originalId: 'B' });
    s = quizReducer(s, { type: 'next' });
    s = quizReducer(s, { type: 'expire' })!;
    expect(s.finished).toBe(true);
    expect(s.expired).toBe(true);
    expect(s.answers).toEqual([
      { selectedOriginalId: 'B' },
      { selectedOriginalId: null },
      { selectedOriginalId: null },
    ]);
    const sum = summarizeSession(s.questions, s.answers);
    expect(sum.totalScore).toBe(5);
    expect(sum.reviewIds).toEqual(['b', 'c']);
    // Setelah selesai, aksi lain diabaikan.
    expect(quizReducer(s, { type: 'answer', originalId: 'A' })).toBe(s);
  });
});
