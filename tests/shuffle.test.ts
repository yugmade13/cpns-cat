import { describe, expect, it } from 'vitest';
import { buildSession, buildSessionQuestion, shuffleArray } from '../src/lib/shuffle';
import { evaluateAnswer } from '../src/lib/scoring';
import { OPTION_IDS } from '../src/types';
import { fixtureBank, makeChoice, seededRng } from './helpers';

const ITERATIONS = 5000;
const bank = fixtureBank();

describe('shuffleArray', () => {
  it('mempertahankan semua elemen dan tidak mengubah input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const rng = seededRng(1);
    for (let i = 0; i < 1000; i++) {
      const out = shuffleArray(input, rng);
      expect([...out].sort()).toEqual(input);
    }
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('menghasilkan sebaran posisi yang kira-kira merata', () => {
    const rng = seededRng(7);
    const counts = [0, 0, 0, 0, 0];
    const n = 20000;
    for (let i = 0; i < n; i++) counts[shuffleArray([0, 1, 2, 3, 4], rng).indexOf(0)]!++;
    for (const c of counts) expect(Math.abs(c / n - 0.2)).toBeLessThan(0.02);
  });
});

describe('buildSessionQuestion', () => {
  it(`kunci jawaban TWK/TIU & skor TKP tetap mengikuti isi opsi (${ITERATIONS}× per soal)`, () => {
    const rng = seededRng(42);
    for (const q of bank) {
      const textById = new Map(q.options.map((o) => [o.id, o.text]));
      for (let i = 0; i < ITERATIONS; i++) {
        const sq = buildSessionQuestion(q, rng);
        // Label baru selalu A–E berurutan.
        expect(sq.options.map((o) => o.label)).toEqual([...OPTION_IDS]);
        // Teks setiap opsi tetap milik id aslinya.
        for (const o of sq.options) expect(o.text).toBe(textById.get(o.originalId));
        if (q.category === 'TKP') {
          for (const o of sq.options) {
            expect(o.score).toBe(q.options.find((x) => x.id === o.originalId)!.score);
          }
          expect(new Set(sq.options.map((o) => o.score)).size).toBe(5);
        } else {
          // Memilih opsi yang teksnya = teks kunci asli harus selalu dinilai benar.
          const correctText = textById.get(q.correctAnswer);
          const shown = sq.options.find((o) => o.text === correctText)!;
          expect(evaluateAnswer(sq, { selectedOriginalId: shown.originalId }).status).toBe('correct');
          for (const o of sq.options.filter((x) => x.text !== correctText)) {
            expect(evaluateAnswer(sq, { selectedOriginalId: o.originalId }).status).toBe('wrong');
          }
        }
      }
    }
  });

  it('benar-benar mengacak opsi bila diizinkan', () => {
    const rng = seededRng(3);
    const q = makeChoice();
    const firstTexts = new Set<string>();
    for (let i = 0; i < 500; i++) firstTexts.add(buildSessionQuestion(q, rng).options[0]!.text);
    expect(firstTexts.size).toBe(5);
  });

  it('tidak mengacak soal dengan shuffleOptions: false', () => {
    const rng = seededRng(5);
    const fixed = bank.filter((q) => !q.shuffleOptions);
    expect(fixed.length).toBeGreaterThan(0);
    for (const q of fixed) {
      for (let i = 0; i < ITERATIONS; i++) {
        const sq = buildSessionQuestion(q, rng);
        expect(sq.options.map((o) => o.originalId)).toEqual(q.options.map((o) => o.id));
        expect(sq.options.map((o) => o.label)).toEqual(q.options.map((o) => o.id));
      }
    }
  });
});

describe('buildSession', () => {
  it(`soal tidak pernah berulang dalam satu sesi (${ITERATIONS} sesi)`, () => {
    const rng = seededRng(99);
    // Sertakan duplikat ID di input untuk memastikan tetap unik.
    const withDupes = [...bank, ...bank.slice(0, 4)];
    for (let i = 0; i < ITERATIONS; i++) {
      const count = 1 + Math.floor(rng() * 20);
      const session = buildSession(withDupes, count, rng);
      const ids = session.map((s) => s.question.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBe(Math.min(count, bank.length));
    }
  });

  it('mengacak urutan soal', () => {
    const rng = seededRng(11);
    const firsts = new Set<string>();
    for (let i = 0; i < 300; i++) firsts.add(buildSession(bank, bank.length, rng)[0]!.question.id);
    expect(firsts.size).toBeGreaterThan(10);
  });

  it('jumlah nol atau bank kosong menghasilkan sesi kosong', () => {
    expect(buildSession(bank, 0)).toEqual([]);
    expect(buildSession([], 10)).toEqual([]);
  });
});
