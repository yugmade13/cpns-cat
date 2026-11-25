// Verifikasi independen setiap soal TIU numerik: jawaban dihitung ulang
// dari angka di soal, lalu dipastikan tepat satu opsi yang cocok.
import { describe, expect, it } from 'vitest';
import type { ChoiceQuestion } from '../src/types';
import { loadFile } from './helpers';

const tiu = loadFile('tiu.json') as ChoiceQuestion[];
const byId = (id: string) => tiu.find((q) => q.id === id)!;
const num = (text: string) => Number(text.replace(/[^\d,.-]/g, '').replace(',', '.'));

function expectUniqueAnswer(q: ChoiceQuestion, value: number) {
  const matches = q.options.filter((o) => Math.abs(num(o.text) - value) < 1e-9);
  expect(matches.map((o) => o.id)).toEqual([q.correctAnswer]);
}

describe('verifikasi soal TIU numerik', () => {
  it('semua soal numerik punya verifikasi di file ini', () => {
    const numeric = tiu.filter((q) => q.subtype === 'numerik').map((q) => q.id).sort();
    expect(numeric).toEqual(['tiu-001', 'tiu-002', 'tiu-005']);
  });

  it('tiu-001: deret 3, 5, 9, 17, 33, …', () => {
    const seq = [3, 5, 9, 17, 33];
    // Pola ×2 − 1 harus cocok dengan seluruh suku yang diberikan.
    for (let i = 1; i < seq.length; i++) expect(seq[i]).toBe(seq[i - 1]! * 2 - 1);
    // Cara kedua: selisih berlipat dua.
    const diffs = seq.slice(1).map((v, i) => v - seq[i]!);
    const next = seq.at(-1)! + diffs.at(-1)! * 2;
    expect(next).toBe(33 * 2 - 1);
    expectUniqueAnswer(byId('tiu-001'), next);
  });

  it('tiu-002: kerja bersama Andi (12 hari) dan Budi (18 hari)', () => {
    // Simulasi per hari dengan pecahan eksak (satuan 1/36).
    const total = 36;
    const andi = total / 12;
    const budi = total / 18;
    let done = 0;
    let days = 0;
    while (days < 4) { done += andi + budi; days++; }
    while (done < total) { done += budi; days++; }
    expect(done).toBe(total); // selesai tepat, tanpa sisa
    expectUniqueAnswer(byId('tiu-002'), days);
    expect(days).toBe(12);
  });

  it('tiu-005: selisih persentase penyelesaian tertinggi dan terendah', () => {
    const rows: [number, number][] = [
      [240, 216],
      [300, 255],
      [280, 266],
      [320, 272],
    ];
    // Pastikan angka tabel di teks soal sama dengan yang dihitung di sini.
    const q = byId('tiu-005');
    for (const [a, b] of rows) expect(q.question).toMatch(new RegExp(`\\|\\s+${a}\\s+\\|\\s+${b}`));
    const pct = rows.map(([a, b]) => (b / a) * 100);
    const diff = Math.round((Math.max(...pct) - Math.min(...pct)) * 1e9) / 1e9;
    expect(diff).toBe(10);
    expectUniqueAnswer(q, diff);
  });
});
