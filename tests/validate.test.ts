import { describe, expect, it } from 'vitest';
import { normalizeRaw, parseQuestions } from '../src/lib/loader';
import { bankStats, findBankIssues, referencesOtherOptions, validateQuestion } from '../src/lib/validate';
import { fixtureBank, makeChoice, makeTkp } from './helpers';

const errorsOf = (q: unknown) => validateQuestion(normalizeRaw(q)).errors;

describe('validateQuestion', () => {
  it('menerima soal TWK/TIU dan TKP yang valid', () => {
    expect(errorsOf(makeChoice())).toEqual([]);
    expect(errorsOf(makeTkp())).toEqual([]);
  });

  it('menolak jumlah opsi selain lima', () => {
    const q = makeChoice();
    expect(errorsOf({ ...q, options: q.options.slice(0, 4) }).join()).toMatch(/tepat 5 opsi/);
  });

  it('menolak teks opsi kosong atau kembar', () => {
    const q = makeChoice();
    const empty = { ...q, options: q.options.map((o, i) => (i === 2 ? { ...o, text: ' ' } : o)) };
    expect(errorsOf(empty).join()).toMatch(/teks kosong/);
    const twin = { ...q, options: q.options.map((o, i) => (i === 2 ? { ...o, text: '4' } : o)) };
    expect(errorsOf(twin).join()).toMatch(/kembar/);
  });

  it('menolak correctAnswer di luar A–E dan explanation kosong', () => {
    expect(errorsOf({ ...makeChoice(), correctAnswer: 'F' }).join()).toMatch(/correctAnswer/);
    expect(errorsOf({ ...makeChoice(), explanation: '' }).join()).toMatch(/explanation/);
  });

  it('menolak kategori dan kesulitan yang tidak dikenal', () => {
    expect(errorsOf({ ...makeChoice(), category: 'SKB' }).join()).toMatch(/category/);
    expect(errorsOf({ ...makeChoice(), difficulty: 'ekstrem' }).join()).toMatch(/difficulty/);
  });

  it('TKP: skor harus bulat 1–5, semuanya berbeda, dan setiap opsi punya penjelasan', () => {
    const t = makeTkp();
    const dup = { ...t, options: t.options.map((o, i) => (i === 0 ? { ...o, score: 5 } : o)) };
    expect(errorsOf(dup).join()).toMatch(/semuanya berbeda/);
    const frac = { ...t, options: t.options.map((o, i) => (i === 0 ? { ...o, score: 3.5 } : o)) };
    expect(errorsOf(frac).join()).toMatch(/bilangan bulat/);
    const out = { ...t, options: t.options.map((o, i) => (i === 0 ? { ...o, score: 6 } : o)) };
    expect(errorsOf(out).join()).toMatch(/1–5/);
    const noExp = { ...t, options: t.options.map((o, i) => (i === 0 ? { ...o, explanation: '' } : o)) };
    expect(errorsOf(noExp).join()).toMatch(/explanation/);
  });

  it('menolak soal yang opsinya merujuk opsi lain tetapi masih boleh diacak', () => {
    const q = makeChoice();
    const ref = { ...q, options: q.options.map((o, i) => (i === 4 ? { ...o, text: 'A dan B benar' } : o)) };
    expect(errorsOf(ref).join()).toMatch(/shuffleOptions/);
    expect(errorsOf({ ...ref, shuffleOptions: false })).toEqual([]);
    expect(referencesOtherOptions('Semua jawaban di atas benar')).toBe(true);
    expect(referencesOtherOptions('Tidak ada jawaban yang benar')).toBe(true);
    expect(referencesOtherOptions('Meneruskan unggahan ke admin')).toBe(false);
  });
});

describe('normalizeRaw (alias field)', () => {
  it('memetakan alias Indonesia dan opsi berbentuk objek', () => {
    const raw = {
      id: 'alias-1',
      kategori: 'twk',
      topik: 'Pancasila',
      kesulitan: 'mudah',
      pertanyaan: 'Lambang sila pertama adalah …',
      opsi: { A: 'Bintang', B: 'Rantai', C: 'Pohon beringin', D: 'Kepala banteng', E: 'Padi dan kapas' },
      jawaban_benar: 'a',
      pembahasan: 'Sila pertama dilambangkan bintang.',
      sumber_internal: 'catatan penulis',
    };
    const { question, errors } = validateQuestion(normalizeRaw(raw));
    expect(errors).toEqual([]);
    expect(question).toMatchObject({ category: 'TWK', difficulty: 'easy', correctAnswer: 'A' });
    expect(question?.options[2]).toEqual({ id: 'C', text: 'Pohon beringin' });
    expect(question?.extra).toEqual({ sumber_internal: 'catatan penulis' });
  });
});

describe('parseQuestions', () => {
  it('melewati soal tidak valid tanpa melempar error dan mencatat alasannya', () => {
    const r = parseQuestions([makeChoice(), { id: 'rusak' }, 42, makeChoice()], 'uji.json');
    expect(r.questions.map((q) => q.id)).toEqual(['x-1']);
    expect(r.rejected.map((x) => x.id)).toEqual(['rusak', '#3', 'x-1']);
    expect(r.rejected[2]!.errors.join()).toMatch(/sudah dipakai/);
  });

  it('menolak isi berkas yang bukan array', () => {
    expect(parseQuestions({ foo: 1 }, 'x.json').rejected[0]!.errors.join()).toMatch(/array/);
    expect(parseQuestions(null, 'x.json').questions).toEqual([]);
  });
});

describe('pemeriksaan bank', () => {
  it('mendeteksi ID ganda, teks ganda, dan soal sangat mirip', () => {
    const a = makeChoice({ id: 'a' });
    const b = makeChoice({ id: 'a', question: 'Berapakah 3 + 1?' });
    const c = makeChoice({ id: 'c' });
    const issues = findBankIssues([a, b, c]);
    expect(issues.some((i) => i.level === 'error' && /ID "a"/.test(i.message))).toBe(true);
    expect(issues.some((i) => i.level === 'error' && /Teks soal ganda/.test(i.message))).toBe(true);
    const d = makeChoice({ id: 'd', question: 'Berapakah hasil penjumlahan dua tambah dua di bawah ini menurut kalian semua?' });
    const e = makeChoice({ id: 'e', question: 'Berapakah hasil penjumlahan dua tambah dua di bawah ini menurut kalian?' });
    expect(findBankIssues([d, e]).some((i) => i.level === 'warning')).toBe(true);
  });

  it('menghitung ringkasan kategori, huruf jawaban, dan posisi skor 5', () => {
    const all = fixtureBank();
    // Bank tiruan juga harus lolos validasi lewat jalur JSON.
    const r = parseQuestions(JSON.parse(JSON.stringify(all)), 'fixture.json');
    expect(r.rejected).toEqual([]);
    expect(findBankIssues(all).filter((i) => i.level === 'error')).toEqual([]);
    const s = bankStats(all);
    expect(s.byCategory).toEqual({ TWK: 6, TIU: 6, TKP: 5 });
    expect(s.answerLetters).toEqual({ A: 3, B: 3, C: 2, D: 2, E: 2 });
    expect(s.tkpTopPositions).toEqual({ A: 1, B: 1, C: 1, D: 1, E: 1 });
  });
});
