// Validator bank soal.
//   npm run validate -- bank-soal.json            (satu file)
//   npm run validate -- twk.json tiu.json         (beberapa file)
//   npm run validate -- folder-soal               (semua .json di folder)
//   npm run validate                              (default: folder bank-soal/)
// Memakai ulang aturan di src/lib/validate.ts dan keluar dengan kode 1 jika ada kesalahan.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { parseQuestions } from '../src/lib/loader';
import { bankStats, findBankIssues } from '../src/lib/validate';
import type { Question } from '../src/types';

const DEFAULT_DIR = 'bank-soal';
const args = process.argv.slice(2);
const targets = (args.length > 0 ? args : [DEFAULT_DIR]).map((a) => resolve(a));

const files: string[] = [];
for (const t of targets) {
  if (!existsSync(t)) {
    console.error(`Path tidak ditemukan: ${t}`);
    continue;
  }
  if (statSync(t).isDirectory()) {
    readdirSync(t)
      .filter((f) => f.toLowerCase().endsWith('.json'))
      .sort()
      .forEach((f) => files.push(join(t, f)));
  } else {
    files.push(t);
  }
}

if (files.length === 0) {
  console.error(
    'Tidak ada file soal (.json) yang bisa divalidasi.\n' +
      'Contoh: npm run validate -- bank-soal.json\n' +
      `Tanpa argumen, validator membaca semua .json di folder "${DEFAULT_DIR}/".`,
  );
  process.exit(1);
}

let errorCount = 0;
let warningCount = 0;
const all: Question[] = [];
const ids = new Set<string>();

const line = (s = '') => console.log(s);
const header = (s: string) => line(`\n=== ${s} ===`);

header(`Memvalidasi ${files.length} berkas`);

for (const path of files) {
  const file = basename(path);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    errorCount++;
    line(`✗ ${file}: bukan JSON yang valid (${(e as Error).message})`);
    continue;
  }
  const r = parseQuestions(data, file, ids);
  r.questions.forEach((q) => ids.add(q.id));
  all.push(...r.questions);
  line(`• ${file}: ${r.questions.length} soal valid, ${r.rejected.length} ditolak`);
  for (const rej of r.rejected) {
    errorCount++;
    line(`  ✗ [ERROR] ${rej.id}: ${rej.errors.join(' | ')}`);
  }
  for (const w of r.warnings) {
    warningCount += w.warnings.length;
    line(`  ! [PERINGATAN] ${w.id}: ${w.warnings.join(' | ')}`);
  }
}

header('Duplikasi & kemiripan');
const issues = findBankIssues(all);
if (issues.length === 0) line('Tidak ada ID ganda, teks ganda, atau soal yang sangat mirip.');
for (const iss of issues) {
  if (iss.level === 'error') errorCount++;
  else warningCount++;
  line(`  ${iss.level === 'error' ? '✗ [ERROR]' : '! [PERINGATAN]'} ${iss.message}`);
}

const stats = bankStats(all);
const fmt = (rec: Record<string, number>) =>
  Object.entries(rec)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `    ${k.padEnd(40)} ${v}`)
    .join('\n');

header('Ringkasan');
line(`Total soal valid: ${stats.total}`);
line('  Per kategori:');
line(fmt(stats.byCategory));
line('  Per topik:');
line(fmt(stats.byTopic));
line('  Per tingkat kesulitan:');
line(fmt(stats.byDifficulty));

const choiceTotal = Object.values(stats.answerLetters).reduce((a, b) => a + b, 0);
const tkpTotal = Object.values(stats.tkpTopPositions).reduce((a, b) => a + b, 0);
const bar = (rec: Record<string, number>, total: number) =>
  Object.entries(rec)
    .map(([k, v]) => `    ${k}: ${String(v).padStart(3)}  ${'█'.repeat(v)}${total ? ` (${Math.round((v / total) * 100)}%)` : ''}`)
    .join('\n');

line('  Sebaran huruf jawaban benar (TWK/TIU):');
line(bar(stats.answerLetters, choiceTotal));
line('  Sebaran posisi skor 5 (TKP):');
line(bar(stats.tkpTopPositions, tkpTotal));

const dominance = (rec: Record<string, number>, total: number, label: string) => {
  if (total < 10) return;
  const max = Math.max(...Object.values(rec));
  if (max / total > 0.35) {
    warningCount++;
    line(`  ! [PERINGATAN] ${label}: satu huruf mendominasi (${Math.round((max / total) * 100)}%).`);
  }
};
dominance(stats.answerLetters, choiceTotal, 'Huruf jawaban benar TWK/TIU');
dominance(stats.tkpTopPositions, tkpTotal, 'Posisi skor 5 TKP');

// Opsi skor 5 tidak boleh bisa ditebak dari panjang kalimat.
const tkp = all.filter((q) => q.category === 'TKP');
const longestTop = tkp.filter((q) => {
  const max = Math.max(...q.options.map((o) => o.text.length));
  return q.options.find((o) => o.score === 5)?.text.length === max;
}).length;
line(`  Opsi skor 5 yang sekaligus opsi terpanjang: ${longestTop} dari ${tkp.length} soal TKP.`);
if (tkp.length >= 5 && longestTop / tkp.length > 0.4) {
  warningCount++;
  line('  ! [PERINGATAN] Opsi skor 5 terlalu sering menjadi opsi terpanjang; jawaban bisa ditebak dari panjang kalimat.');
}

header('Hasil');
line(`${errorCount} kesalahan, ${warningCount} peringatan.`);
if (errorCount > 0) {
  line('Validasi GAGAL.');
  process.exit(1);
}
line('Validasi LOLOS.');
