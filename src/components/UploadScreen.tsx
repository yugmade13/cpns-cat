import type { Bank } from '../hooks/useBank';
import { AiPromptPanel } from './AiPromptPanel';
import { OfficialNotice } from './OfficialNotice';
import { UploadPanel } from './UploadPanel';

const EXAMPLE = `[
  {
    "id": "twk-001",
    "category": "TWK",
    "topic": "Pancasila",
    "difficulty": "easy",
    "question": "Teks soal …",
    "options": [
      { "id": "A", "text": "…" },
      { "id": "B", "text": "…" },
      { "id": "C", "text": "…" },
      { "id": "D", "text": "…" },
      { "id": "E", "text": "…" }
    ],
    "correctAnswer": "C",
    "explanation": "Pembahasan …"
  },
  {
    "id": "tkp-001",
    "category": "TKP",
    "topic": "Pelayanan publik",
    "difficulty": "medium",
    "context": "Situasi kerja …",
    "question": "Apa yang sebaiknya Anda lakukan?",
    "options": [
      { "id": "A", "text": "…", "score": 3, "explanation": "…" },
      { "id": "B", "text": "…", "score": 5, "explanation": "…" },
      { "id": "C", "text": "…", "score": 1, "explanation": "…" },
      { "id": "D", "text": "…", "score": 4, "explanation": "…" },
      { "id": "E", "text": "…", "score": 2, "explanation": "…" }
    ],
    "competency": "…",
    "principle": "…",
    "whyBest": "…",
    "lesson": "…"
  }
]`;

export function UploadScreen({ bank }: { bank: Bank }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
      <header className="space-y-3 text-center">
        <OfficialNotice />
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Latihan SKD CPNS 2027</h1>
        <p className="mx-auto max-w-xl text-[16px] text-slate-600">
          Persiapkan dirimu dengan latihan terstruktur dan pembahasan lengkap.
        </p>
      </header>

      <section className="card space-y-4 p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-navy-900">Unggah Bank Soal</h2>
          <p className="mt-1 text-[15px] text-slate-600">
            Belum ada soal. Unggah file <strong>.json</strong> berisi soal TWK, TIU, dan/atau TKP untuk mulai berlatih.
          </p>
        </div>
        <UploadPanel bank={bank} />
        <p className="text-sm text-slate-600">
          {bank.persistent
            ? 'Soal disimpan di browser ini saja dan tidak dikirim ke mana pun. Kamu tidak perlu mengunggah ulang saat membuka aplikasi lagi.'
            : 'Browser ini tidak mengizinkan penyimpanan (misalnya mode privat), jadi soal perlu diunggah ulang setiap kali aplikasi dibuka.'}
        </p>
      </section>

      <details className="card group/ai">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
          <span>
            <span className="block font-semibold text-navy-800">Belum punya file soal? Buat dengan AI</span>
            <span className="block text-sm text-slate-600">Salin prompt siap pakai yang sudah berisi format yang benar.</span>
          </span>
          <span className="text-slate-400 transition-transform group-open/ai:rotate-180" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="border-t border-slate-200 p-4">
          <AiPromptPanel />
        </div>
      </details>

      <details className="card group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-navy-800 hover:bg-slate-50">
          Format file soal
          <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true">
            ▾
          </span>
        </summary>
        <div className="space-y-3 border-t border-slate-200 p-4 text-[15px] text-slate-700">
          <p>
            File berisi <strong>array</strong> soal. Kategori setiap soal ditentukan oleh field <code>category</code>, jadi
            soal TWK, TIU, dan TKP boleh dicampur dalam satu file.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Setiap soal punya tepat 5 opsi (A–E) dan <code>id</code> yang unik.</li>
            <li>
              TWK/TIU: <code>correctAnswer</code> (A–E) dan <code>explanation</code> wajib.
            </li>
            <li>
              TKP: setiap opsi punya <code>score</code> 1–5 yang berbeda semua, plus <code>explanation</code>.
            </li>
            <li>
              <code>difficulty</code>: <code>easy</code>, <code>medium</code>, atau <code>hard</code>.
            </li>
          </ul>
          <pre className="max-h-80 overflow-auto rounded-lg bg-slate-900 p-3 text-xs leading-relaxed text-slate-100">{EXAMPLE}</pre>
          <p className="text-sm text-slate-500">
            Format lengkap, field opsional (langkah hitung, cara cepat, dasar rujukan), dan aturan kualitas ada di
            PANDUAN_SOAL.md pada repositori aplikasi.
          </p>
        </div>
      </details>
    </div>
  );
}
