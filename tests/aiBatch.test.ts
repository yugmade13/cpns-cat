// Jawaban AI terpotong, lanjutan jawaban (append), dan nama set yang mudah dibaca.
import { describe, expect, it } from 'vitest';
import { buildAiPrompt, splitCount } from '../src/lib/aiPrompt';
import {
  aiPrefixOf,
  applyImport,
  displayName,
  parseUploadText,
  prepareImport,
  salvageTruncatedArray,
  type BankFile,
} from '../src/lib/bankFiles';
import { makeBatchLabel } from '../src/lib/promptLabels';
import { makeChoice, makeTkp } from './helpers';

const P = 'ai2611251900xy';
const q = (n: number, cat: 'TWK' | 'TIU' | 'TKP' = 'TWK') =>
  cat === 'TKP'
    ? makeTkp({ id: `${P}-tkp-${String(n).padStart(3, '0')}`, context: `Situasi ${n}.`, question: `Apa yang Anda lakukan (${n})?` })
    : makeChoice({ id: `${P}-${cat.toLowerCase()}-${String(n).padStart(3, '0')}`, category: cat, question: `Soal nomor ${n}?` });
const FENCE = '```';

describe('menyelamatkan jawaban AI yang terpotong', () => {
  const full = JSON.stringify([q(1), q(2), q(3, 'TKP')], null, 2);

  it('mengambil soal yang sudah lengkap dan membuang yang terpotong', () => {
    const cut = full.slice(0, full.length - 40); // terpotong di tengah soal ke-3
    const r = salvageTruncatedArray(cut);
    expect(r?.count).toBe(2);
    expect((JSON.parse(r!.json) as { id: string }[]).map((x) => x.id)).toEqual([`${P}-twk-001`, `${P}-twk-002`]);
  });

  it('tidak tertipu kurung kurawal/siku dan kutip yang di-escape di dalam teks soal', () => {
    const tricky = makeChoice({ id: `${P}-tiu-001`, category: 'TIU', question: 'Hitung {a} dan [b], lalu "kutip" } ] \\ selesai?' });
    const text = `[${JSON.stringify(tricky)}, ${JSON.stringify(q(2)).slice(0, 30)}`;
    const r = salvageTruncatedArray(text);
    expect(r?.count).toBe(1);
    expect((JSON.parse(r!.json) as { question: string }[])[0]!.question).toBe(tricky.question);
  });

  it('null bila array sudah tertutup atau belum ada soal lengkap', () => {
    expect(salvageTruncatedArray(full)).toBeNull();
    expect(salvageTruncatedArray('[{"id": "a", "question": "terpot')).toBeNull();
    expect(salvageTruncatedArray('tidak ada json')).toBeNull();
  });

  it('jawaban AI berbungkus blok kode yang terpotong (tanpa penutup) tetap terbaca', () => {
    const ai = `File tidak dapat dilampirkan. Berikut JSON-nya:\n\n${FENCE}json\n${full.slice(0, full.length - 40)}`;
    const u = parseUploadText('x', ai);
    expect(u.fatal).toBeNull();
    expect(u.truncated).toBe(true);
    const [p] = prepareImport([], [u]);
    expect(p!.questions).toHaveLength(2);
    expect(p!.truncated).toBe(true);
  });

  it('JSON lengkap tidak ditandai terpotong', () => {
    expect(parseUploadText('x', full).truncated).toBeUndefined();
  });
});

describe('lanjutan jawaban AI ditambahkan ke set yang sama', () => {
  const base = (): BankFile[] =>
    applyImport([], prepareImport([], [{ name: `${P}.json`, data: JSON.parse(JSON.stringify([q(1), q(2)])), fatal: null }]).map((p) => ({ ...p, label: 'TWK · 25 Nov 19.00' })), 1);

  it('teks tempelan dengan ID baru → ditambahkan, bukan menggantikan', () => {
    const existing = base();
    const [p] = prepareImport(existing, [{ name: `${P}.json`, data: JSON.parse(JSON.stringify([q(3), q(4)])), fatal: null, appendIfNew: true }]);
    expect(p!.appends).toBe(true);
    expect(p!.replaces).toBe(false);
    const next = applyImport(existing, [p!], 2);
    expect(next).toHaveLength(1);
    expect(next[0]!.questions.map((x) => x.id)).toEqual([`${P}-twk-001`, `${P}-twk-002`, `${P}-twk-003`, `${P}-twk-004`]);
    expect(next[0]!.label).toBe('TWK · 25 Nov 19.00');
  });

  it('teks tempelan dengan ID yang sama (batch diperbaiki) → menggantikan', () => {
    const [p] = prepareImport(base(), [{ name: `${P}.json`, data: JSON.parse(JSON.stringify([q(1)])), fatal: null, appendIfNew: true }]);
    expect(p!.appends).toBe(false);
    expect(p!.replaces).toBe(true);
  });

  it('lanjutan yang mengulang sebagian soal lama: soal ganda ditolak, sisanya ditambahkan', () => {
    const [p] = prepareImport(base(), [
      { name: `${P}.json`, data: JSON.parse(JSON.stringify([q(3)])), fatal: null, appendIfNew: true },
    ]);
    expect(p!.appends).toBe(true);
    // Kasus campuran (sebagian ID lama) dianggap perbaikan → replaces, bukan append.
    const [mixed] = prepareImport(base(), [
      { name: `${P}.json`, data: JSON.parse(JSON.stringify([q(2), q(5)])), fatal: null, appendIfNew: true },
    ]);
    expect(mixed!.replaces).toBe(true);
  });

  it('file bagian berikutnya dari prompt (nama berbeda, awalan ID sama) → ditambahkan ke set yang sama', () => {
    const [p] = prepareImport(base(), [{ name: `${P}-bagian-2.json`, data: JSON.parse(JSON.stringify([q(3)])), fatal: null }]);
    expect(p!.appends).toBe(true);
    expect(p!.name).toBe(`${P}.json`);
    const next = applyImport(base(), [p!]);
    expect(next).toHaveLength(1);
    expect(next[0]!.questions).toHaveLength(3);
  });

  it('beberapa file bagian diunggah sekaligus → satu set', () => {
    const parts = [
      { name: `${P}-bagian-1.json`, data: JSON.parse(JSON.stringify([q(1), q(2)])), fatal: null },
      { name: `${P}-bagian-2.json`, data: JSON.parse(JSON.stringify([q(3), q(4, 'TKP')])), fatal: null },
    ];
    const prepared = prepareImport([], parts);
    expect(prepared.map((x) => [x.name, x.appends])).toEqual([
      [`${P}-bagian-1.json`, false],
      [`${P}-bagian-1.json`, true],
    ]);
    const files = applyImport([], prepared);
    expect(files).toHaveLength(1);
    expect(files[0]!.questions).toHaveLength(4);
  });

  it('file biasa (bukan dari prompt aplikasi) bernama sama tetap menggantikan', () => {
    const plain = (ids: string[]) => JSON.parse(JSON.stringify(ids.map((id, i) => makeChoice({ id, question: `Soal biasa ${id} ${i}?` }))));
    const existing = applyImport([], prepareImport([], [{ name: 'twk.json', data: plain(['twk-001']), fatal: null }]));
    const [p] = prepareImport(existing, [{ name: 'twk.json', data: plain(['twk-002']), fatal: null }]);
    expect(p!.replaces).toBe(true);
    expect(p!.appends).toBe(false);
  });

  it('nama hasil ganti nama dipertahankan saat set diganti', () => {
    const renamed = base().map((f) => ({ ...f, label: 'Tryout 1' }));
    const prepared = prepareImport(renamed, [{ name: `${P}.json`, data: JSON.parse(JSON.stringify([q(1)])), fatal: null }]).map((p) => ({ ...p, label: 'Label prompt' }));
    expect(applyImport(renamed, prepared)[0]!.label).toBe('Tryout 1');
  });
});

describe('nama set yang mudah dibaca', () => {
  const d = new Date(2026, 10, 25, 19, 5);
  it('dibentuk dari pilihan di panel AI', () => {
    expect(makeBatchLabel({ category: 'TIU', topic: 'Deret angka', difficulty: 'hard' }, d)).toBe('TIU · Deret angka · Sulit · 25 Nov 19.05');
    expect(makeBatchLabel({ category: 'MIX', topic: 'ALL', difficulty: 'ALL' }, d)).toBe('Campuran · 25 Nov 19.05');
    expect(makeBatchLabel({ category: 'TKP', topic: 'ALL', difficulty: 'easy' }, d)).toBe('TKP · Mudah · 25 Nov 19.05');
  });

  it('displayName: label bila ada, selain itu nama file tanpa .json', () => {
    expect(displayName({ name: 'ai26.json', label: 'Tryout 1' })).toBe('Tryout 1');
    expect(displayName({ name: 'ai26.json', label: '  ' })).toBe('ai26');
    expect(displayName({ name: 'twk.json' })).toBe('twk');
  });

  it('aiPrefixOf mengenali awalan ID dari prompt', () => {
    expect(aiPrefixOf(['soal-1', `${P}-tkp-001`])).toBe(P);
    expect(aiPrefixOf(['twk-001'])).toBeNull();
  });

  it('prompt meminta langsung blok kode tanpa penjelasan, tanpa instruksi "lanjutkan"', () => {
    const p = buildAiPrompt({ category: 'MIX', count: 5, difficulty: 'ALL', topic: 'ALL', idPrefix: P });
    expect(p).toContain('tanpa permintaan maaf atau penjelasan tambahan');
    expect(p.toLowerCase()).not.toContain('lanjutkan');
  });
});

describe('prompt ringan: jumlah total, pembagian seimbang, JSON ringkas', () => {
  const build = (category: 'MIX' | 'TIU', count: number) => buildAiPrompt({ category, count, difficulty: 'ALL', topic: 'ALL', idPrefix: P });

  it('pembagian Campuran seimbang: 5 → 2/2/1, 10 → 4/3/3, 15 → 5/5/5', () => {
    const f = (n: number) => splitCount('MIX', n).map((x) => x.count);
    expect(f(5)).toEqual([2, 2, 1]);
    expect(f(10)).toEqual([4, 3, 3]);
    expect(f(15)).toEqual([5, 5, 5]);
    expect(splitCount('TIU', 10)).toEqual([{ category: 'TIU', count: 10 }]);
  });

  it('jumlah = total soal; satu jawaban tanpa dibagi', () => {
    const p = build('MIX', 5);
    expect(p).toContain('Buatkan 5 soal');
    expect(p).toContain('- 2 soal TWK');
    expect(p).toContain('- 2 soal TIU');
    expect(p).toContain(`- 1 soal TKP, ID "${P}-tkp-001"; topik dipilih dari daftar`);
    expect(p).not.toContain('BAGIAN');
    expect(p).toContain(`buat SATU file bernama "${P}.json"`);
  });

  it('kategori tunggal: semua soal untuk kategori itu', () => {
    const p = build('TIU', 15);
    expect(p).toContain('Buatkan 15 soal');
    expect(p).toContain(`- 15 soal TIU, ID "${P}-tiu-001" sampai "${P}-tiu-015"`);
    expect(p).not.toContain('ATURAN TKP');
  });

  it('meminta JSON ringkas tanpa field opsional kosong, contoh tanpa "tags"', () => {
    const p = build('MIX', 5);
    expect(p).toContain('Tulis JSON RINGKAS');
    expect(p).toContain('jangan tulis field "shuffleOptions" (bawaannya true)');
    expect(p).not.toContain('"tags": [');
    expect(p).not.toContain('"shuffleOptions": true\n');
  });

  it('soal dengan field opsional dihilangkan (JSON ringkas) tetap lolos validasi', () => {
    const compact = { id: `${P}-twk-001`, category: 'TWK', topic: 'Pancasila', difficulty: 'easy', question: 'Sila pertama?', options: ['A', 'B', 'C', 'D', 'E'].map((id, i) => ({ id, text: `Opsi ${i}` })), correctAnswer: 'A', explanation: 'Karena …' };
    const [r] = prepareImport([], [parseUploadText('x', JSON.stringify([compact]))]);
    expect(r!.rejected).toEqual([]);
    expect(r!.questions[0]!.shuffleOptions).toBe(true);
  });
});
