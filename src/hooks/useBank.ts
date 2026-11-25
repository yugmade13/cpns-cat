import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applyImport,
  MAX_UPLOAD_BYTES,
  parseUploadText,
  prepareImport,
  type BankFile,
  type ParsedUpload,
  type PreparedFile,
} from '../lib/bankFiles';
import { deleteStoredFile, loadStoredFiles, saveFiles } from '../lib/bankStore';
import { logRejected, parseQuestions } from '../lib/loader';

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Memvalidasi ulang file yang tersimpan (aturan bisa berubah antarversi aplikasi). */
function revalidate(stored: unknown[]): BankFile[] {
  const ids = new Set<string>();
  const files: BankFile[] = [];
  for (const raw of stored) {
    if (!isRecord(raw) || typeof raw.name !== 'string') continue;
    const r = parseQuestions(raw.questions, raw.name, ids);
    logRejected(r.rejected);
    r.questions.forEach((q) => ids.add(q.id));
    if (r.questions.length > 0) {
      files.push({ name: raw.name, uploadedAt: typeof raw.uploadedAt === 'number' ? raw.uploadedAt : 0, questions: r.questions });
    }
  }
  return files.sort((a, b) => a.uploadedAt - b.uploadedAt || a.name.localeCompare(b.name));
}

export interface ImportReport {
  files: PreparedFile[];
  cancelled: boolean;
}

const SAVE_ERROR = 'Soal tidak berhasil disimpan di browser (mungkin penyimpanan penuh). Soal tetap bisa dipakai sampai halaman ditutup.';

/** Bank soal milik satu pengguna (owner = username). */
export function useBank(owner: string) {
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<BankFile[]>([]);
  const [persistent, setPersistent] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;

  useEffect(() => {
    let cancelled = false;
    void loadStoredFiles(owner).then(({ available, files: stored }) => {
      if (cancelled) return;
      setPersistent(available);
      setFiles(revalidate(stored));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [owner]);

  const all = useMemo(() => files.flatMap((f) => f.questions), [files]);

  const prepareUploads = (uploads: ParsedUpload[]): PreparedFile[] => {
    const prepared = prepareImport(filesRef.current, uploads);
    prepared.forEach((p) => logRejected(p.rejected));
    return prepared;
  };

  /** Membaca & memvalidasi file pilihan pengguna tanpa mengubah bank. */
  const prepare = useCallback(async (list: File[]): Promise<PreparedFile[]> => {
    const uploads: ParsedUpload[] = await Promise.all(
      list.map(async (file) => {
        if (file.size > MAX_UPLOAD_BYTES) return { name: file.name, fatal: 'Ukuran berkas melebihi 5 MB.' };
        try {
          return parseUploadText(file.name, await file.text());
        } catch (e) {
          return { name: file.name, fatal: `Berkas gagal dibaca: ${(e as Error).message}` };
        }
      }),
    );
    return prepareUploads(uploads);
  }, []);

  /** Menerapkan hasil persiapan ke bank dan menyimpannya di browser. */
  const commit = useCallback(
    async (prepared: PreparedFile[]) => {
      const next = applyImport(filesRef.current, prepared);
      filesRef.current = next;
      setFiles(next);
      setReport({ files: prepared, cancelled: false });
      const changed = next.filter((f) => prepared.some((p) => p.name === f.name && p.questions.length > 0));
      if (!persistent || changed.length === 0) return;
      try {
        await saveFiles(owner, changed);
        setSaveError(null);
      } catch {
        setSaveError(SAVE_ERROR);
      }
    },
    [persistent, owner],
  );

  const cancelImport = useCallback((prepared: PreparedFile[]) => setReport({ files: prepared, cancelled: true }), []);
  const dismissReport = useCallback(() => setReport(null), []);

  const removeFile = useCallback(
    async (name: string) => {
      // Hapus dari penyimpanan dulu agar muat ulang segera setelahnya tidak memunculkan soal lama.
      if (persistent) await deleteStoredFile(owner, name).catch(() => undefined);
      const next = filesRef.current.filter((f) => f.name !== name);
      filesRef.current = next;
      setFiles(next);
      setReport(null); // laporan unggahan lama tidak relevan lagi
    },
    [persistent, owner],
  );

  return {
    loading,
    files,
    all,
    persistent,
    saveError,
    report,
    prepare,
    commit,
    cancelImport,
    dismissReport,
    removeFile,
  };
}

export type Bank = ReturnType<typeof useBank>;
