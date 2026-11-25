import { useCallback, useMemo, useState } from 'react';
import type { ImportReport } from '../hooks/useBank';
import type { StoredIds } from '../hooks/useStoredIds';
import { bySourceAndCategory, filterQuestions, requestedCount, topicOptions } from '../lib/filter';
import { CATEGORY_DESCRIPTION, CATEGORY_FILTER_LABEL } from '../lib/labels';
import type { CategoryFilter, CountSetting, DifficultyFilter, Question, QuestionSource, SessionConfig, TimerSetting } from '../types';
import { BankManager } from './BankManager';
import { ConfirmDialog } from './ConfirmDialog';
import { AlertIcon } from './Icons';
import { OfficialNotice } from './OfficialNotice';

interface Props {
  all: Question[];
  importedCount: number;
  stored: StoredIds;
  config: SessionConfig;
  onConfigChange: (c: SessionConfig) => void;
  onStart: (c: SessionConfig) => void;
  onImport: (file: File) => Promise<ImportReport>;
  onClearImported: () => void;
}

interface SegOption<T> {
  value: T;
  label: string;
  disabled?: boolean;
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  cols = 4,
}: {
  label: string;
  value: T;
  options: SegOption<T>[];
  onChange: (v: T) => void;
  cols?: number;
}) {
  const grid = cols === 3 ? 'grid-cols-3' : cols === 2 ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4';
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-navy-900">{label}</legend>
      <div className={`grid gap-2 ${grid}`} role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={o.disabled}
              onClick={() => onChange(o.value)}
              className={`min-h-12 rounded-lg border px-2 py-2 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 ${
                active ? 'border-navy-800 bg-navy-800 text-white' : 'border-slate-300 bg-white text-navy-800 hover:border-royal-500 hover:bg-royal-50'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

const CATEGORIES: CategoryFilter[] = ['TWK', 'TIU', 'TKP', 'MIX'];

export function StartScreen({ all, importedCount, stored, config, onConfigChange, onStart, onImport, onClearImported }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const closeClear = useCallback(() => setConfirmClear(false), []);
  const lists = { bookmarks: stored.bookmarks, wrong: stored.wrong };
  const set = (patch: Partial<SessionConfig>) => onConfigChange({ ...config, ...patch });

  const ids = useMemo(() => new Set(all.map((q) => q.id)), [all]);
  const bookmarkCount = stored.bookmarks.filter((id) => ids.has(id)).length;
  const wrongCount = stored.wrong.filter((id) => ids.has(id)).length;

  const scoped = useMemo(() => bySourceAndCategory(all, config, lists), [all, config, lists.bookmarks, lists.wrong]);
  const topics = useMemo(() => topicOptions(scoped), [scoped]);
  const topicValid = config.topic === 'ALL' || topics.some((t) => t.value === config.topic);
  const effective: SessionConfig = topicValid ? config : { ...config, topic: 'ALL' };
  const matching = filterQuestions(all, effective, lists);
  const available = matching.length;
  const requested = requestedCount(effective, available);

  const countFor = (c: CategoryFilter) => bySourceAndCategory(all, { ...config, category: c }, lists).length;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
      <header className="space-y-3 text-center">
        <OfficialNotice />
        <h1 className="text-2xl font-extrabold tracking-tight text-navy-900 sm:text-3xl">Latihan SKD CPNS 2026</h1>
        <p className="mx-auto max-w-xl text-[16px] text-slate-600">
          Persiapkan dirimu dengan latihan terstruktur dan pembahasan lengkap.
        </p>
      </header>

      <section className="card space-y-6 p-4 sm:p-6">
        {stored.available && (
          <Segmented<QuestionSource>
            label="Sumber soal"
            value={config.source}
            cols={3}
            onChange={(v) => set({ source: v, topic: 'ALL' })}
            options={[
              { value: 'all', label: 'Semua Soal' },
              { value: 'bookmark', label: `Bookmark (${bookmarkCount})`, disabled: bookmarkCount === 0 },
              { value: 'wrong', label: `Pernah Salah (${wrongCount})`, disabled: wrongCount === 0 },
            ]}
          />
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-navy-900">Kategori</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Kategori">
            {CATEGORIES.map((c) => {
              const active = config.category === c;
              const n = countFor(c);
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => set({ category: c, topic: 'ALL' })}
                  className={`flex min-h-20 flex-col items-start justify-between rounded-xl border p-3 text-left transition-colors ${
                    active ? 'border-navy-800 bg-navy-800 text-white' : 'border-slate-300 bg-white text-navy-900 hover:border-royal-500 hover:bg-royal-50'
                  }`}
                >
                  <span className="text-lg font-bold">{CATEGORY_FILTER_LABEL[c]}</span>
                  <span className={`text-xs leading-snug ${active ? 'text-navy-100' : 'text-slate-500'}`}>
                    {CATEGORY_DESCRIPTION[c]} · {n} soal
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-navy-900">Topik</span>
            <select
              className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-800"
              value={effective.topic}
              onChange={(e) => set({ topic: e.target.value })}
            >
              <option value="ALL">Semua topik</option>
              {topics.map((t) => (
                <option key={t.value} value={t.value}>
                  {config.category === 'MIX' ? t.label : t.value}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-navy-900">Tingkat kesulitan</span>
            <select
              className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-800"
              value={config.difficulty}
              onChange={(e) => set({ difficulty: e.target.value as DifficultyFilter })}
            >
              <option value="ALL">Semua</option>
              <option value="easy">Mudah</option>
              <option value="medium">Sedang</option>
              <option value="hard">Sulit</option>
            </select>
          </label>
        </div>

        <Segmented<CountSetting>
          label="Jumlah soal"
          value={config.count}
          onChange={(v) => set({ count: v })}
          options={[
            { value: 5, label: '5' },
            { value: 10, label: '10' },
            { value: 20, label: '20' },
            { value: 'ALL', label: `Semua (${available})` },
          ]}
        />

        <Segmented<TimerSetting>
          label="Timer per soal"
          value={config.timer}
          cols={3}
          onChange={(v) => set({ timer: v })}
          options={[
            { value: 0, label: 'Mati' },
            { value: 60, label: '60 detik' },
            { value: 90, label: '90 detik' },
          ]}
        />

        <div aria-live="polite">
          {available === 0 ? (
            <p className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[15px] text-red-900 ring-1 ring-red-200">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
              Tidak ada soal yang cocok dengan pilihan ini. Ubah kategori, topik, tingkat kesulitan, atau sumber soal.
            </p>
          ) : available < requested ? (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-[15px] text-amber-900 ring-1 ring-amber-200">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
              Hanya tersedia {available} soal yang cocok (kamu meminta {requested}). Latihan akan memakai {available} soal.
            </p>
          ) : (
            <p className="text-center text-sm text-slate-600">
              {available} soal cocok. Latihan berisi {requested} soal acak.
            </p>
          )}
        </div>

        <button type="button" className="btn-primary w-full text-base" disabled={available === 0} onClick={() => onStart(effective)}>
          Mulai Latihan
        </button>
      </section>

      <BankManager all={all} importedCount={importedCount} onImport={onImport} onClearImported={onClearImported} />

      <section className="card space-y-2 p-4 text-[15px]">
        <h2 className="font-semibold text-navy-900">Data Tersimpan di Perangkat</h2>
        {stored.available ? (
          <>
            <p className="text-slate-600">
              Aplikasi hanya menyimpan ID soal yang kamu bookmark ({stored.bookmarks.length}) dan ID soal yang pernah salah (
              {stored.wrong.length}) di browser ini. Soal yang pernah salah akan keluar dari daftar setelah kamu menjawabnya
              dengan benar.
            </p>
            <button
              type="button"
              className="btn-ghost -ml-3 text-red-700 hover:bg-red-50 disabled:text-slate-400 disabled:hover:bg-transparent"
              disabled={stored.bookmarks.length === 0 && stored.wrong.length === 0}
              onClick={() => setConfirmClear(true)}
            >
              Hapus Data Tersimpan
            </button>
          </>
        ) : (
          <p className="text-slate-600">
            Penyimpanan browser tidak tersedia (misalnya mode privat), jadi fitur bookmark dan daftar soal yang pernah salah
            dinonaktifkan. Latihan tetap bisa dipakai seperti biasa.
          </p>
        )}
      </section>

      <p className="hidden text-center text-xs text-slate-500 sm:block">
        Pintasan keyboard saat latihan: 1–5 atau A–E untuk memilih opsi, Enter untuk lanjut.
      </p>

      <ConfirmDialog
        open={confirmClear}
        title="Hapus data tersimpan?"
        message="Daftar bookmark dan soal yang pernah salah akan dihapus dari browser ini. Tindakan ini tidak bisa dibatalkan."
        confirmLabel="Hapus"
        danger
        onConfirm={() => {
          stored.clearAll();
          set({ source: 'all', topic: 'ALL' });
          setConfirmClear(false);
        }}
        onCancel={closeClear}
      />
    </div>
  );
}
