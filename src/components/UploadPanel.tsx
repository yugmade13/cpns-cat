import { useCallback, useRef, useState } from 'react';
import type { Bank } from '../hooks/useBank';
import { describeCounts, displayName, type PreparedFile } from '../lib/bankFiles';
import { ConfirmDialog } from './ConfirmDialog';
import { AlertIcon, CheckIcon, XIcon } from './Icons';

interface Props {
  bank: Bank;
  /** Label tombol utama. */
  label?: string;
  /** Tampilkan laporan unggahan terakhir di bawah panel. */
  showReport?: boolean;
}

export function UploadPanel({ bank, label = 'Pilih File JSON', showReport = true }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<PreparedFile[] | null>(null);
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const [text, setText] = useState('');
  const { commit, cancelImport, dismissReport } = bank;

  /** Menyimpan hasil; jika berasal dari teks tempelan dan berhasil, kosongkan kotak teks. */
  const save = async (prepared: PreparedFile[]) => {
    await commit(prepared);
    if (mode === 'text' && prepared.some((p) => p.questions.length > 0)) setText('');
  };

  const handleText = () => {
    dismissReport();
    const prepared = bank.prepareText(text);
    if (prepared.some((p) => p.replaces)) setPending(prepared);
    else void save(prepared);
  };

  const handleFiles = async (list: FileList | null | undefined) => {
    const arr = list ? [...list] : [];
    if (inputRef.current) inputRef.current.value = '';
    if (arr.length === 0) return;
    setBusy(true);
    dismissReport();
    try {
      const prepared = await bank.prepare(arr);
      if (prepared.some((p) => p.replaces)) setPending(prepared);
      else await save(prepared);
    } finally {
      setBusy(false);
    }
  };

  /** Nama tampilan: pakai nama set yang sudah ada di bank bila ada. */
  const nameOf = (f: PreparedFile) => displayName(bank.files.find((x) => x.name === f.name) ?? f);
  const replacing = pending?.filter((p) => p.replaces).map(nameOf) ?? [];
  const cancelReplace = useCallback(() => {
    if (pending) cancelImport(pending);
    setPending(null);
  }, [pending, cancelImport]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Cara memasukkan soal">
        {(
          [
            ['file', 'Unggah File'],
            ['text', 'Tempel Teks'],
          ] as const
        ).map(([value, text]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={`min-h-10 rounded-md text-sm font-semibold ${mode === value ? 'bg-white text-brand-ink shadow-sm' : 'text-slate-600 hover:text-brand-ink'}`}
          >
            {text}
          </button>
        ))}
      </div>

      {mode === 'text' ? (
        <div className="space-y-2">
          <label className="block">
            <span className="mb-1.5 block text-sm text-slate-600">
              Tempel jawaban AI atau isi JSON di sini. Kalimat pembuka dari AI dan pembungkus blok kode akan diabaikan.
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Teks JSON soal"
              placeholder='[ { "id": "…", "category": "TWK", … } ]'
              spellCheck={false}
              className="block h-44 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-xs leading-relaxed text-slate-800"
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn-primary" disabled={text.trim() === ''} onClick={handleText}>
              Muat Soal dari Teks
            </button>
            {text !== '' && (
              <button type="button" className="btn-ghost" onClick={() => setText('')}>
                Kosongkan
              </button>
            )}
          </div>
        </div>
      ) : (
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand ${
          dragging ? 'border-brand bg-brand-50' : 'border-slate-300 bg-slate-50 hover:border-brand hover:bg-brand-50'
        } ${busy ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <span className="btn-primary pointer-events-none">{busy ? 'Memproses…' : label}</span>
        <span className="text-sm text-slate-600">
          Boleh satu file gabungan (TWK, TIU, dan TKP sekaligus) atau beberapa file. Di komputer, file juga bisa diseret ke
          sini.
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          multiple
          className="sr-only"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </label>
      )}

      {showReport && <UploadReport bank={bank} />}

      {bank.saveError && (
        <p className="rounded-lg bg-amber-50 p-3 text-[15px] text-amber-900 ring-1 ring-amber-200">{bank.saveError}</p>
      )}

      <ConfirmDialog
        open={pending !== null}
        title="Ganti file yang sudah ada?"
        message={`Set soal berikut sudah ada dan isinya akan diganti dengan versi baru: ${replacing.join(', ')}.`}
        confirmLabel="Ganti"
        onConfirm={() => {
          const p = pending;
          setPending(null);
          if (p) void save(p);
        }}
        onCancel={cancelReplace}
      />
    </div>
  );
}

/** Laporan hasil unggahan terakhir: soal yang ditambahkan, diganti, dan ditolak beserta alasannya. */
function UploadReport({ bank }: { bank: Bank }) {
  const report = bank.report;
  if (!report) return null;
  return (
    <div role="status" className="space-y-2">
      {report.cancelled ? (
        <p className="rounded-lg bg-slate-100 p-3 text-[15px] text-slate-700 ring-1 ring-slate-200">
          Unggahan dibatalkan. Bank soal tidak berubah.
        </p>
      ) : (
        report.files.map((f, idx) => {
          const okFile = !f.fatal && f.questions.length > 0;
          const existing = bank.files.find((x) => x.name === f.name);
          const name = displayName(existing ?? f);
          return (
            <div
              key={`${f.name}-${idx}`}
              className={`rounded-lg p-3 text-[15px] ring-1 ${okFile ? 'bg-green-50 text-green-900 ring-green-200' : 'bg-red-50 text-red-900 ring-red-200'}`}
            >
              <p className="flex items-start gap-2 font-semibold">
                {okFile ? <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" /> : <XIcon className="mt-0.5 h-4 w-4 shrink-0" />}
                <span className="min-w-0 wrap-break-word">{name}</span>
              </p>
              <p className="mt-1">
                {f.fatal
                  ? f.fatal
                  : f.questions.length > 0
                    ? f.appends
                      ? `${f.questions.length} soal lanjutan ditambahkan ke set ini (${describeCounts(f.questions)}). Total sekarang ${existing?.questions.length ?? f.questions.length} soal.`
                      : `${f.questions.length} soal ${f.replaces ? 'menggantikan versi lama' : 'ditambahkan'} (${describeCounts(f.questions)}).`
                    : 'Tidak ada soal yang valid, jadi file ini tidak disimpan.'}
                {f.rejected.length > 0 && ` ${f.rejected.length} soal ditolak:`}
              </p>
              {f.truncated && okFile && (
                <p className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 p-2 text-sm text-amber-900 ring-1 ring-amber-200">
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Jawaban AI terpotong, jadi hanya soal yang lengkap yang dimuat. Agar semua soal lengkap, pilih jumlah soal
                    yang lebih sedikit lalu salin prompt lagi.
                  </span>
                </p>
              )}
              {f.rejected.length > 0 && (
                <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
                  {f.rejected.slice(0, 30).map((r, i) => (
                    <li key={`${r.id}-${i}`} className="wrap-break-word">
                      <strong>{r.id}</strong>: {r.errors.join(' ')}
                    </li>
                  ))}
                  {f.rejected.length > 30 && <li>…dan {f.rejected.length - 30} lainnya (lihat console browser).</li>}
                </ul>
              )}
            </div>
          );
        })
      )}
      <button type="button" className="btn-ghost -ml-3" onClick={bank.dismissReport}>
        Tutup laporan
      </button>
    </div>
  );
}
