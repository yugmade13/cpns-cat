import { useCallback, useState } from 'react';
import type { Bank } from '../hooks/useBank';
import type { StoredIds } from '../hooks/useStoredIds';
import { describeCounts, displayName } from '../lib/bankFiles';
import { suggestedTimer } from '../lib/sessionTimer';
import { TIMER_OPTIONS, type Question, type SessionMode, type TimerSetting } from '../types';
import { BankManager } from './BankManager';
import { ConfirmDialog } from './ConfirmDialog';
import { CheckIcon } from './Icons';

export interface PracticeSelection {
  questions: Question[];
  title: string;
}

interface Props {
  bank: Bank;
  stored: StoredIds;
  timer: TimerSetting;
  onTimerChange: (t: TimerSetting) => void;
  /** Pilihan soal terakhir (diingat antarsesi). */
  mode: SessionMode;
  onModeChange: (m: SessionMode) => void;
  selectedKey: string;
  onSelect: (key: string) => void;
  onStart: (selection: PracticeSelection) => void;
}

interface Choice extends PracticeSelection {
  key: string;
  label: string;
  hint?: string;
}



/** Pilihan soal yang bisa dilatih: semua soal, per file (jika lebih dari satu), bookmark, dan soal yang pernah salah. */
function buildChoices(bank: Bank, stored: StoredIds): Choice[] {
  const choices: Choice[] = [
    { key: 'all', label: 'Semua soal', title: 'Semua Soal', questions: bank.all },
  ];
  if (bank.files.length > 1) {
    for (const f of bank.files) {
      choices.push({
        key: `file:${f.name}`,
        label: displayName(f),
        title: displayName(f),
        questions: f.questions,
      });
    }
  }
  if (stored.available) {
    const bm = new Set(stored.bookmarks);
    const wr = new Set(stored.wrong);
    const bookmarked = bank.all.filter((q) => bm.has(q.id));
    const wrong = bank.all.filter((q) => wr.has(q.id));
    if (bookmarked.length > 0) {
      choices.push({ key: 'bookmark', label: 'Soal yang di-bookmark', title: 'Soal Bookmark', questions: bookmarked });
    }
    if (wrong.length > 0) {
      choices.push({
        key: 'wrong',
        label: 'Soal yang pernah salah',
        hint: 'Soal keluar dari daftar ini setelah dijawab benar.',
        title: 'Soal yang Pernah Salah',
        questions: wrong,
      });
    }
  }
  return choices;
}

const MODES: { value: SessionMode; label: string; hint: string }[] = [
  { value: 'practice', label: 'Latihan', hint: 'Jawaban langsung dikunci dan pembahasan muncul setiap soal.' },
  { value: 'exam', label: 'Ujian', hint: 'Seperti CAT: bebas pindah nomor dan ganti jawaban, tandai ragu-ragu. Skor dan pembahasan muncul setelah ujian selesai.' },
];

export function StartScreen({ bank, stored, timer, onTimerChange, mode, onModeChange, selectedKey, onSelect: setSelectedKey, onStart }: Props) {
  const [confirmClear, setConfirmClear] = useState(false);
  const closeClear = useCallback(() => setConfirmClear(false), []);

  const choices = buildChoices(bank, stored);
  const selected = choices.find((c) => c.key === selectedKey) ?? choices[0]!;
  const report = bank.report && !bank.report.cancelled ? bank.report : null;
  const n = selected.questions.length;
  const suggested = suggestedTimer(n);
  const secs = timer > 0 && n > 0 ? Math.floor((timer * 60) / n) : 0;
  const perQuestion = secs >= 60 ? `${Math.floor(secs / 60)} menit${secs % 60 ? ` ${secs % 60} detik` : ''}` : `${secs} detik`;
  const loadedNow = report ? report.files.reduce((n, f) => n + f.questions.length, 0) : 0;
  const rejectedNow = report ? report.files.reduce((n, f) => n + f.rejected.length + (f.fatal ? 1 : 0), 0) : 0;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-3 py-5 sm:px-6 sm:py-8">
      <header className="space-y-3 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink sm:text-3xl">Simulasi SKD CPNS 2027</h1>
        <p className="mx-auto max-w-xl text-[16px] text-slate-600">
          Persiapkan dirimu dengan latihan terstruktur dan pembahasan lengkap.
        </p>
      </header>

      {report && (
        <div role="status" className="flex items-start gap-2 rounded-lg bg-green-50 p-3 text-[15px] text-green-900 ring-1 ring-green-200">
          <CheckIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1">
            {loadedNow} soal berhasil dimuat.
            {rejectedNow > 0 && ` Ada ${rejectedNow} soal/file yang ditolak; rinciannya di "Kelola Bank Soal" di bawah.`}
          </p>
          <button type="button" className="btn-ghost -my-1 min-h-8 px-2 text-green-900 hover:bg-green-100" onClick={bank.dismissReport}>
            Tutup
          </button>
        </div>
      )}

      <section className="card space-y-6 p-4 sm:p-6">
        {choices.length > 1 ? (
          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-brand-ink">Soal yang dilatih</legend>
            <div className="space-y-2" role="radiogroup" aria-label="Soal yang dilatih">
              {choices.map((c) => {
                const active = c.key === selected.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelectedKey(c.key)}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                      active ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-brand-ink hover:border-brand hover:bg-brand-50'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold wrap-break-word">{c.label}</span>
                      <span className={`block text-xs ${active ? 'text-white/85' : 'text-slate-500'}`}>
                        {describeCounts(c.questions)}
                        {c.hint && ` · ${c.hint}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums">{c.questions.length} soal</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ) : (
          <div className="rounded-xl bg-brand-50 p-4 text-center">
            <p className="text-3xl font-extrabold tabular-nums text-brand-ink">{selected.questions.length}</p>
            <p className="text-sm font-semibold text-brand-ink">soal siap dilatih</p>
            <p className="mt-1 text-sm text-slate-600">{describeCounts(selected.questions)}</p>
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-ink">Mode</legend>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Mode">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                onClick={() => onModeChange(m.value)}
                className={`min-h-12 rounded-lg border px-2 text-[15px] font-semibold transition-colors ${
                  mode === m.value ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-brand-ink hover:border-brand hover:bg-brand-50'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-sm text-slate-600">{MODES.find((m) => m.value === mode)!.hint}</p>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-brand-ink">Waktu</legend>
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Waktu">
            {TIMER_OPTIONS.map((t) => {
              const active = timer === t;
              const isSuggested = t === suggested;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onTimerChange(t)}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-lg border px-1 py-1 text-[15px] font-semibold leading-tight transition-colors ${
                    active ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-brand-ink hover:border-brand hover:bg-brand-50'
                  }`}
                >
                  {t === 0 ? 'Tanpa batas' : `${t} menit`}
                  {isSuggested && <span className={`text-[11px] font-medium ${active ? 'text-white/85' : 'text-brand-ink'}`}>saran</span>}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {timer === 0
              ? `Tanpa batas waktu. Untuk simulasi ujian, disarankan sekitar ${suggested} menit untuk ${n} soal (±1 menit per soal).`
              : `Waktu dihitung untuk seluruh sesi (${n} soal, rata-rata ${perQuestion} per soal). Jika waktu habis, soal yang belum dijawab dihitung tidak terjawab.`}
          </p>
        </fieldset>

        <div className="space-y-2">
          <button
            type="button"
            className="btn-primary w-full text-base"
            onClick={() => onStart({ questions: selected.questions, title: selected.title })}
          >
            {mode === 'exam' ? 'Mulai Ujian' : 'Mulai Latihan'} ({selected.questions.length} soal)
          </button>
          <p className="text-center text-sm text-slate-500">Urutan soal dan pilihan jawaban diacak setiap sesi.</p>
        </div>
      </section>

      <BankManager bank={bank} />

      <section className="card space-y-2 p-4 text-[15px]">
        <h2 className="font-semibold text-brand-ink">Data Tersimpan di Perangkat</h2>
        {stored.available ? (
          <>
            <p className="text-slate-600">
              Selain bank soal, aplikasi menyimpan ID soal yang kamu bookmark ({stored.bookmarks.length}) dan ID soal yang
              pernah salah ({stored.wrong.length}) di browser ini. Soal yang pernah salah akan keluar dari daftar setelah kamu
              menjawabnya dengan benar.
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
        message="Daftar bookmark dan soal yang pernah salah akan dihapus dari browser ini. Bank soal tidak ikut terhapus."
        confirmLabel="Hapus"
        danger
        onConfirm={() => {
          stored.clearAll();
          setSelectedKey('all');
          setConfirmClear(false);
        }}
        onCancel={closeClear}
      />
    </div>
  );
}
