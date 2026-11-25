import { useCallback, useState } from 'react';
import type { Bank } from '../hooks/useBank';
import { describeCounts } from '../lib/bankFiles';
import { AiPromptPanel } from './AiPromptPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { UploadPanel } from './UploadPanel';

type Pending = { name: string } | null;

export function BankManager({ bank }: { bank: Bank }) {
  const [pending, setPending] = useState<Pending>(null);
  const close = useCallback(() => setPending(null), []);
  // Terbuka otomatis bila baru saja ada unggahan (mis. langsung setelah unggahan pertama).
  const [initiallyOpen] = useState(() => bank.report !== null);

  return (
    <details className="card group" open={initiallyOpen}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-navy-800 hover:bg-slate-50">
        <span>
          Kelola Bank Soal{' '}
          <span className="font-normal text-slate-500">
            ({bank.all.length} soal, {bank.files.length} file)
          </span>
        </span>
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-200 p-4 text-[15px]">
        <ul className="divide-y divide-slate-200 rounded-lg ring-1 ring-slate-200" aria-label="File soal tersimpan">
          {bank.files.map((f) => (
            <li key={f.name} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 wrap-break-word">{f.name}</p>
                <p className="text-sm text-slate-600">
                  {f.questions.length} soal · {describeCounts(f.questions)}
                </p>
              </div>
              <button
                type="button"
                className="btn-ghost text-red-700 hover:bg-red-50"
                onClick={() => setPending({ name: f.name })}
                aria-label={`Hapus file ${f.name}`}
              >
                Hapus
              </button>
            </li>
          ))}
        </ul>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-navy-900">Tambah atau perbarui soal</h3>
          <UploadPanel bank={bank} label="Unggah File JSON" />
          <p className="mt-2 text-sm text-slate-500">
            Mengunggah file dengan nama yang sama akan mengganti isi file lama (kamu akan diminta konfirmasi dulu).
          </p>
        </div>

        <details className="group/ai rounded-lg ring-1 ring-slate-200">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 font-semibold text-navy-800 hover:bg-slate-50">
            Buat soal baru dengan AI
            <span className="text-slate-400 transition-transform group-open/ai:rotate-180" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="border-t border-slate-200 p-3">
            <AiPromptPanel />
          </div>
        </details>

        {!bank.persistent && (
          <p className="text-sm text-amber-800">Browser ini tidak mengizinkan penyimpanan, jadi soal hilang saat halaman ditutup.</p>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Hapus file soal?"
        message={`Soal dari file ${pending?.name ?? ''} akan dihapus dari browser ini.${
          bank.files.length === 1 ? ' Ini file terakhir, jadi kamu perlu mengunggah soal lagi untuk berlatih.' : ''
        }`}
        confirmLabel="Hapus"
        danger
        onConfirm={() => {
          const p = pending;
          setPending(null);
          if (p) void bank.removeFile(p.name);
        }}
        onCancel={close}
      />
    </details>
  );
}
