import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadBank, logRejected, parseQuestions, type RejectedQuestion } from '../lib/loader';
import type { Question } from '../types';

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; builtIn: Question[]; rejected: RejectedQuestion[] };

export interface ImportReport {
  fileName: string;
  added: number;
  rejected: RejectedQuestion[];
  fatal: string | null;
}

const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export function useBank() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [imported, setImported] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    loadBank()
      .then((r) => {
        if (!cancelled) setState({ status: 'ready', builtIn: r.questions, rejected: r.rejected });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ status: 'error', message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const all = useMemo(
    () => (state.status === 'ready' ? [...state.builtIn, ...imported] : []),
    [state, imported],
  );

  const importFile = useCallback(
    async (file: File): Promise<ImportReport> => {
      const report: ImportReport = { fileName: file.name, added: 0, rejected: [], fatal: null };
      if (file.size > MAX_IMPORT_BYTES) {
        report.fatal = 'Ukuran berkas melebihi 5 MB.';
        return report;
      }
      let data: unknown;
      try {
        data = JSON.parse(await file.text());
      } catch {
        report.fatal = 'Berkas bukan JSON yang valid. Periksa tanda koma, kutip, dan kurung.';
        return report;
      }
      const r = parseQuestions(data, file.name, new Set(all.map((q) => q.id)));
      logRejected(r.rejected);
      report.added = r.questions.length;
      report.rejected = r.rejected;
      if (r.questions.length > 0) setImported((prev) => [...prev, ...r.questions]);
      return report;
    },
    [all],
  );

  const clearImported = useCallback(() => setImported([]), []);

  return { state, all, imported, retry, importFile, clearImported };
}

export type Bank = ReturnType<typeof useBank>;
