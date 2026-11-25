import { describe, expect, it } from 'vitest';
import { applyImport, countByCategory, parseUploadText, prepareImport, type BankFile } from '../src/lib/bankFiles';
import { fixtureBank, makeChoice } from './helpers';

const upload = (name: string, data: unknown) => ({ name, data, fatal: null });

describe('impor bank soal dari file', () => {
  const bank = fixtureBank();
  const json = JSON.parse(JSON.stringify(bank)) as unknown;

  it('satu file berisi TWK, TIU, dan TKP sekaligus dipilah per kategori', () => {
    const [p] = prepareImport([], [upload('gabungan.json', json)]);
    expect(p!.fatal).toBeNull();
    expect(p!.rejected).toEqual([]);
    expect(countByCategory(p!.questions)).toEqual({ TWK: 6, TIU: 6, TKP: 5 });
    const files = applyImport([], [p!], 1);
    expect(files).toHaveLength(1);
    expect(files[0]!.questions).toHaveLength(17);
  });

  it('beberapa file sekaligus digabung; ID ganda antarfile ditolak', () => {
    const a = bank.filter((q) => q.category === 'TWK');
    const b = [...bank.filter((q) => q.category === 'TKP'), a[0]];
    const prepared = prepareImport([], [upload('twk.json', a), upload('tkp.json', b)]);
    expect(prepared[0]!.questions).toHaveLength(6);
    expect(prepared[1]!.questions).toHaveLength(5);
    expect(prepared[1]!.rejected.map((r) => r.id)).toEqual(['twk-001']);
  });

  it('nama file sama menggantikan versi lama dan ID-nya tidak dianggap ganda', () => {
    const existing: BankFile[] = applyImport([], prepareImport([], [upload('bank.json', json)]), 1);
    const newer = [...bank.slice(0, 3), makeChoice({ id: 'twk-baru', category: 'TWK' })];
    const prepared = prepareImport(existing, [upload('bank.json', newer)]);
    expect(prepared[0]!.replaces).toBe(true);
    expect(prepared[0]!.rejected).toEqual([]);
    const next = applyImport(existing, prepared, 2);
    expect(next).toHaveLength(1);
    expect(next[0]!.questions.map((q) => q.id)).toEqual(['twk-001', 'twk-002', 'twk-003', 'twk-baru']);
    expect(next[0]!.uploadedAt).toBe(2);
  });

  it('file dengan nama lain tetap ditolak jika ID-nya sudah ada', () => {
    const existing = applyImport([], prepareImport([], [upload('bank.json', json)]), 1);
    const [p] = prepareImport(existing, [upload('lain.json', bank.slice(0, 2))]);
    expect(p!.questions).toHaveLength(0);
    expect(p!.rejected).toHaveLength(2);
    expect(applyImport(existing, [p!])).toEqual(existing);
  });

  it('file rusak, bukan array, atau kosong tidak mengubah bank dan versi lama dipertahankan', () => {
    const existing = applyImport([], prepareImport([], [upload('bank.json', json)]), 1);
    const broken = parseUploadText('bank.json', '{ "id": ');
    expect(broken.fatal).toMatch(/bukan JSON yang valid/);
    const prepared = prepareImport(existing, [broken, upload('objek.json', { a: 1 }), upload('kosong.json', [])]);
    expect(prepared.map((p) => p.fatal)).toEqual([
      expect.stringMatching(/bukan JSON/),
      expect.stringMatching(/array/),
      expect.stringMatching(/tidak berisi soal/),
    ]);
    expect(prepared.every((p) => !p.replaces)).toBe(true);
    expect(applyImport(existing, prepared)).toEqual(existing);
  });

  it('file yang semua soalnya tidak valid tidak menggantikan versi lama', () => {
    const existing = applyImport([], prepareImport([], [upload('bank.json', json)]), 1);
    const [p] = prepareImport(existing, [upload('bank.json', [{ id: 'rusak' }])]);
    expect(p!.replaces).toBe(false);
    expect(p!.rejected).toHaveLength(1);
    expect(applyImport(existing, [p!])).toEqual(existing);
  });

  it('jika nama file sama dipilih dua kali dalam satu unggahan, yang terakhir dipakai', () => {
    const prepared = prepareImport([], [upload('x.json', bank.slice(0, 1)), upload('x.json', bank.slice(0, 2))]);
    expect(prepared).toHaveLength(1);
    expect(prepared[0]!.questions).toHaveLength(2);
  });
});
