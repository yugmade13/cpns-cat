import { describe, expect, it } from 'vitest';
import { buildAiPrompt, makeIdPrefix } from '../src/lib/aiPrompt';
import { suggestedTimer } from '../src/lib/sessionTimer';
import { parseUploadText, pastedFileName, prepareImport } from '../src/lib/bankFiles';
import { normalizeRaw } from '../src/lib/loader';
import { validateQuestion } from '../src/lib/validate';
import { fixtureBank } from './helpers';

const base = { count: 10, difficulty: 'ALL' as const, topic: 'ALL', idPrefix: 'ai2611251432xy' };

/** Mengambil blok contoh JSON dari prompt (dimulai baris "{" setelah judul contoh). */
function examples(prompt: string): unknown[] {
  return [...prompt.matchAll(/Contoh soal [^:]+:\n(\{[\s\S]*?\n\})/g)].map((m) => JSON.parse(m[1]!) as unknown);
}

describe('prompt AI', () => {
  it('Campuran: memuat rencana ketiga kategori, jumlah total, dan pola ID', () => {
    const p = buildAiPrompt({ ...base, category: 'MIX' });
    // count = jumlah TOTAL (10) → dibagi seimbang 4/3/3
    expect(p).toContain('Buatkan 10 soal');
    expect(p).toContain('- 4 soal TWK, ID "ai2611251432xy-twk-001" sampai "ai2611251432xy-twk-004"');
    expect(p).toContain('- 3 soal TIU, ID "ai2611251432xy-tiu-001" sampai "ai2611251432xy-tiu-003"');
    expect(p).toContain('- 3 soal TKP, ID "ai2611251432xy-tkp-001" sampai "ai2611251432xy-tkp-003"');
    expect(p).toContain('ATURAN TWK');
    expect(p).toContain('ATURAN TIU');
    expect(p).toContain('ATURAN TKP');
    // Satu jawaban (tanpa dibagi), file tunggal bila AI bisa, tanpa instruksi "lanjutkan"
    expect(p).not.toContain('BAGIAN');
    expect(p).toContain('buat SATU file bernama "ai2611251432xy.json"');
    expect(p).toContain('SATU blok kode berlabel json (diawali ```json');
    expect(p.toLowerCase()).not.toContain('lanjutkan');
    expect(p).toContain('lalu tulis hasilnya sesuai FORMAT KELUARAN');

  });

  it('kategori tunggal + topik: hanya aturan kategori itu dan topik yang dipilih', () => {
    const p = buildAiPrompt({ ...base, category: 'TIU', count: 5, topic: 'Deret angka', difficulty: 'hard' });
    expect(p).toContain('Buatkan 5 soal');
    expect(p).toContain('semua bertopik "Deret angka"');
    expect(p).toContain('semuanya sulit (hard)');
    expect(p).not.toContain('ATURAN TKP');
    expect(p).not.toContain('Contoh soal TKP');
  });

  it('contoh JSON di dalam prompt adalah JSON valid dengan field yang dikenali validator', () => {
    const ex = examples(buildAiPrompt({ ...base, category: 'MIX' }));
    expect(ex).toHaveLength(2);
    // Ganti "…" agar contoh menjadi soal utuh, lalu pastikan validator menerimanya.
    const filled = ex.map((e, i) =>
      JSON.parse(
        JSON.stringify(e).replace(/…/g, () => `isi ${i}-${Math.random().toString(36).slice(2, 8)}`),
      ) as unknown,
    );
    for (const q of filled) expect(validateQuestion(normalizeRaw(q)).errors).toEqual([]);
  });

  it('awalan ID berbasis waktu', () => {
    expect(makeIdPrefix(new Date(2026, 10, 25, 14, 32))).toBe('ai2611251432');
  });
});

describe('unggah jawaban AI', () => {
  const FENCE = '```';

  it('file berisi kalimat pembuka AI + blok kode tetap terbaca', () => {
    const json = JSON.stringify(fixtureBank());
    const pasted = `Tentu! Berikut 17 soal sesuai permintaan:\n\n${FENCE}json\n${json}\n${FENCE}\n\nSemoga membantu.`;
    const u = parseUploadText('x', pasted);
    expect(u.fatal).toBeNull();
    expect(prepareImport([], [u])[0]!.questions).toHaveLength(17);
  });

  it('file tanpa blok kode tetapi dengan kalimat pembuka tetap terbaca', () => {
    const u = parseUploadText('x', 'Berikut soalnya:\n' + JSON.stringify(fixtureBank()) + '\nSelesai.');
    expect(u.fatal).toBeNull();
  });

  it('file rusak/terpotong ditolak dengan pesan ramah', () => {
    expect(parseUploadText('x', '[{"id": "a", "category": "TWK"').fatal).toMatch(/bukan JSON yang valid/);
    expect(parseUploadText('x', '   ').fatal).toMatch(/kosong/);
  });

  it('nama tempelan memakai awalan ID dari prompt AI', () => {
    expect(pastedFileName([{ id: 'ai2611251432xy-tiu-001' }])).toBe('ai2611251432xy.json');
    expect(pastedFileName([{ id: 'soal-01' }], new Date(2026, 10, 25, 9, 5, 7))).toBe('tempelan-20261125-090507.json');
  });


  it('menerima JSON yang dibungkus blok kode ```json', () => {
    const json = JSON.stringify(fixtureBank());
    const u = parseUploadText('soal-ai.json', '﻿```json\n' + json + '\n```\n');
    expect(u.fatal).toBeNull();
    expect(prepareImport([], [u])[0]!.questions).toHaveLength(17);
  });
});

describe('saran waktu latihan', () => {
  it('±1 menit per soal, dibulatkan ke pilihan di atasnya, maksimal 60 menit', () => {
    expect(suggestedTimer(5)).toBe(10);
    expect(suggestedTimer(15)).toBe(15);
    expect(suggestedTimer(16)).toBe(20);
    expect(suggestedTimer(45)).toBe(45);
    expect(suggestedTimer(50)).toBe(60);
    expect(suggestedTimer(200)).toBe(60);
  });
});
