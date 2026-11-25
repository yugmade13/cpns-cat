import { useCallback, useState } from 'react';
import type { Bank } from '../hooks/useBank';
import { describeCounts, displayName, type BankFile } from '../lib/bankFiles';
import { AiPromptPanel } from './AiPromptPanel';
import { ConfirmDialog } from './ConfirmDialog';
import { UploadPanel } from './UploadPanel';

type Pending = { name: string; label: string } | null;

/** Satu baris set soal: nama (bisa diganti), jumlah soal, tombol Ganti nama & Hapus. */
function FileRow({ file, onRename, onDelete }: { file: BankFile; onRename: (label: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const name = displayName(file);

  if (editing) {
    return (
      <li className="p-3">
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            onRename(draft);
            setEditing(false);
          }}
        >
          <label className="sr-only" htmlFor={`rename-${file.name}`}>
            Nama baru untuk {name}
          </label>
          <input
            id={`rename-${file.name}`}
            className="min-h-10 flex-1 rounded-lg border border-slate-300 px-3 text-[15px] focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            value={draft}
            maxLength={80}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditing(false);
            }}
            placeholder={file.name.replace(/.json$/i, '')}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary min-h-10 flex-1 px-4 text-sm sm:flex-none">
              Simpan
            </button>
            <button type="button" className="btn-secondary min-h-10 flex-1 px-4 text-sm sm:flex-none" onClick={() => setEditing(false)}>
              Batal
            </button>
          </div>
        </form>
        <p className="mt-1 text-xs text-slate-500">Kosongkan untuk kembali ke nama file asli.</p>
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1 p-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-800 wrap-break-word">{name}</p>
        <p className="text-sm text-slate-600">
          {file.questions.length} soal · {describeCounts(file.questions)}
        </p>
      </div>
      <button
        type="button"
        className="btn-ghost px-2"
        onClick={() => {
          setDraft(name);
          setEditing(true);
        }}
        aria-label={`Ganti nama ${name}`}
      >
        Ganti nama
      </button>
      <button type="button" className="btn-ghost px-2 text-red-700 hover:bg-red-50" onClick={onDelete} aria-label={`Hapus ${name}`}>
        Hapus
      </button>
    </li>
  );
}

export function BankManager({ bank }: { bank: Bank }) {
  const [pending, setPending] = useState<Pending>(null);
  const close = useCallback(() => setPending(null), []);
  // Terbuka otomatis bila baru saja ada unggahan (mis. langsung setelah unggahan pertama).
  const [initiallyOpen] = useState(() => bank.report !== null);

  return (
    <details className="card group" open={initiallyOpen}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-brand-ink hover:bg-slate-50">
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
            <FileRow
              key={f.name}
              file={f}
              onRename={(label) => void bank.renameFile(f.name, label)}
              onDelete={() => setPending({ name: f.name, label: displayName(f) })}
            />
          ))}
        </ul>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-brand-ink">Tambah atau perbarui soal</h3>
          <UploadPanel bank={bank} label="Unggah File JSON" />
          <p className="mt-2 text-sm text-slate-500">
            Mengunggah file dengan nama yang sama akan mengganti isi file lama (kamu akan diminta konfirmasi dulu).
          </p>
        </div>

        <details className="group/ai rounded-lg ring-1 ring-slate-200">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 font-semibold text-brand-ink hover:bg-slate-50">
            Buat soal baru dengan AI
            <span className="text-slate-400 transition-transform group-open/ai:rotate-180" aria-hidden="true">
              ▾
            </span>
          </summary>
          <div className="border-t border-slate-200 p-3">
            <AiPromptPanel onPromptCopied={bank.rememberPrompt} />
          </div>
        </details>

        {!bank.persistent && (
          <p className="text-sm text-amber-800">Browser ini tidak mengizinkan penyimpanan, jadi soal hilang saat halaman ditutup.</p>
        )}
      </div>

      <ConfirmDialog
        open={pending !== null}
        title="Hapus set soal?"
        message={`Set soal "${pending?.label ?? ''}" akan dihapus dari browser ini.${
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
