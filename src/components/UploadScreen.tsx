import type { Bank } from '../hooks/useBank';
import { AiPromptPanel } from './AiPromptPanel';
import { UploadPanel } from './UploadPanel';

export function UploadScreen({ bank }: { bank: Bank }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
      <header className="space-y-3 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink sm:text-3xl">Simulasi SKD CPNS 2027</h1>
        <p className="mx-auto max-w-xl text-[16px] text-slate-600">
          Persiapkan dirimu dengan latihan terstruktur dan pembahasan lengkap.
        </p>
      </header>

      <section className="card space-y-4 p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-bold text-brand-ink">Unggah Bank Soal</h2>
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
            <span className="block font-semibold text-brand-ink">Belum punya file soal? Buat dengan AI</span>
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
    </div>
  );
}
