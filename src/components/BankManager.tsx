import { useRef, useState } from 'react';
import type { ImportReport } from '../hooks/useBank';
import { toExportJson } from '../lib/loader';
import type { Question } from '../types';

interface Props {
  all: Question[];
  importedCount: number;
  onImport: (file: File) => Promise<ImportReport>;
  onClearImported: () => void;
}

export function BankManager({ all, importedCount, onImport, onClearImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      setReport(await onImport(file));
    } catch (e) {
      setReport({ fileName: file.name, added: 0, rejected: [], fatal: `Berkas gagal dibaca: ${(e as Error).message}` });
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const download = () => {
    const blob = new Blob([toExportJson(all)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bank-soal-skd-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <details className="card group">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 font-semibold text-navy-800 hover:bg-slate-50">
        Kelola Bank Soal
        <span className="text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true">
          ▾
        </span>
      </summary>
      <div className="space-y-4 border-t border-slate-200 p-4 text-[15px]">
        <p className="text-slate-600">
          Soal aktif: <strong>{all.length}</strong>
          {importedCount > 0 && <> (termasuk {importedCount} soal impor)</>}. Soal impor hanya berlaku sampai halaman
          ditutup atau dimuat ulang, dan tidak disimpan.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row">
          <label className={`btn-secondary cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-royal-500 ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            {busy ? 'Memproses…' : 'Unggah JSON Soal'}
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => void handleFile(e.target.files?.[0])}
            />
          </label>
          <button type="button" className="btn-secondary" onClick={download} disabled={all.length === 0}>
            Unduh Semua Soal Aktif (.json)
          </button>
          {importedCount > 0 && (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                onClearImported();
                setReport(null);
              }}
            >
              Buang Soal Impor
            </button>
          )}
        </div>

        {report && (
          <div
            role="status"
            className={`rounded-lg p-3 ring-1 ${
              report.fatal || report.added === 0 ? 'bg-red-50 text-red-900 ring-red-200' : 'bg-green-50 text-green-900 ring-green-200'
            }`}
          >
            <p className="font-semibold">{report.fileName}</p>
            {report.fatal ? (
              <p>{report.fatal}</p>
            ) : (
              <p>
                {report.added} soal ditambahkan
                {report.rejected.length > 0 && `, ${report.rejected.length} soal ditolak`}.
              </p>
            )}
            {report.rejected.length > 0 && (
              <ul className="mt-2 max-h-48 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
                {report.rejected.slice(0, 30).map((r, i) => (
                  <li key={`${r.id}-${i}`} className="wrap-break-word">
                    <strong>{r.id}</strong>: {r.errors.join(' ')}
                  </li>
                ))}
                {report.rejected.length > 30 && <li>…dan {report.rejected.length - 30} lainnya (lihat console).</li>}
              </ul>
            )}
          </div>
        )}
        <p className="text-xs text-slate-500">
          Format JSON mengikuti PANDUAN_SOAL.md: array soal dengan field seperti id, category, topic, difficulty, question,
          options, dan correctAnswer (TWK/TIU) atau score per opsi (TKP).
        </p>
      </div>
    </details>
  );
}
