import { useCallback, useEffect, useRef, useState } from 'react';
import { formatClock, useCountdown } from '../hooks/useCountdown';
import type { QuizState } from '../hooks/useQuizSession';
import { DIFFICULTY_LABEL, subtypeLabel } from '../lib/labels';
import type { OptionId } from '../types';
import { ConfirmDialog } from './ConfirmDialog';
import { FeedbackPanel } from './FeedbackPanel';
import { BookmarkIcon, ClockIcon } from './Icons';
import { OptionButton } from './OptionButton';
import { RichText } from './RichText';

interface Props {
  quiz: QuizState;
  bookmarkEnabled: boolean;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onAnswer: (originalId: OptionId) => void;
  /** Dipanggil saat waktu sesi habis. */
  onExpire: () => void;
  onNext: () => void;
  onExit: () => void;
}

const KEY_TO_INDEX: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, a: 0, b: 1, c: 2, d: 3, e: 4 };

export function QuestionScreen({ quiz, bookmarkEnabled, isBookmarked, onToggleBookmark, onAnswer, onExpire, onNext, onExit }: Props) {
  const sq = quiz.questions[quiz.index]!;
  const q = sq.question;
  const answer = quiz.answers[quiz.index] ?? null;
  const answered = answer !== null;
  const total = quiz.questions.length;
  const isLast = quiz.index === total - 1;
  const [confirmExit, setConfirmExit] = useState(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  // Timer total sesi: berjalan terus lintas soal sampai sesi selesai.
  const remaining = useCountdown(quiz.deadline, onExpire);

  // Kembali ke atas saat pindah soal.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [quiz.index]);

  // Gulir ke umpan balik setelah menjawab.
  useEffect(() => {
    if (answered) feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [answered]);

  const closeConfirm = useCallback(() => setConfirmExit(false), []);

  // Pintasan keyboard: 1–5 / A–E memilih opsi, Enter lanjut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmExit || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (!answered) {
        const idx = KEY_TO_INDEX[e.key.toLowerCase()];
        if (idx !== undefined) {
          e.preventDefault();
          onAnswer(sq.options[idx]!.originalId);
        }
      } else if (e.key === 'Enter') {
        // Biarkan tombol yang sedang fokus menangani Enter sendiri.
        if (target && (target.tagName === 'BUTTON' || target.tagName === 'A')) return;
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, confirmExit, onAnswer, onNext, sq]);

  const progress = ((quiz.index + (answered ? 1 : 0)) / total) * 100;
  const sub = subtypeLabel(q);
  const bookmarked = isBookmarked(q.id);
  const lowTime = remaining !== null && remaining <= 60;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-8 pt-3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-3 mb-4 border-b border-slate-200 bg-slate-100/95 px-3 pb-3 pt-2 backdrop-blur sm:mx-0 sm:rounded-b-xl sm:px-0">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn-ghost -ml-2" onClick={() => setConfirmExit(true)}>
            ← Keluar
          </button>
          <p className="text-sm font-semibold text-navy-800" aria-live="polite">
            Soal {quiz.index + 1} dari {total}
          </p>
          {remaining !== null ? (
            <p
              className={`flex min-w-[4.5rem] items-center justify-end gap-1 text-sm font-bold tabular-nums ${
                lowTime ? 'rounded-md bg-red-50 px-1.5 text-red-700' : 'text-navy-800'
              }`}
              role="timer"
              aria-label={`Sisa waktu latihan ${Math.floor(remaining / 60)} menit ${remaining % 60} detik`}
            >
              <ClockIcon className="h-4 w-4" />
              {formatClock(remaining)}
            </p>
          ) : (
            <span className="min-w-[4.5rem]" />
          )}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="Kemajuan latihan">
          <div className="h-full rounded-full bg-royal-600 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className="card p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="chip bg-navy-800 text-white">{q.category}</span>
          {sub && <span className="chip bg-navy-100 text-navy-800">{sub}</span>}
          <span className="chip bg-royal-50 text-royal-700">{q.topic}</span>
          <span className="chip bg-slate-100 text-slate-700">{DIFFICULTY_LABEL[q.difficulty]}</span>
          {bookmarkEnabled && (
            <button
              type="button"
              className={`ml-auto inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold ${
                bookmarked ? 'text-amber-700' : 'text-slate-500 hover:text-navy-700'
              }`}
              aria-pressed={bookmarked}
              onClick={() => onToggleBookmark(q.id)}
            >
              <BookmarkIcon className="h-5 w-5" filled={bookmarked} />
              {bookmarked ? 'Tersimpan' : 'Simpan'}
            </button>
          )}
        </div>

        {q.category === 'TKP' && q.context && (
          <div className="mb-3 rounded-lg bg-slate-50 p-3 text-[16px] leading-relaxed text-slate-700 ring-1 ring-slate-200">
            <RichText text={q.context} />
          </div>
        )}
        <RichText text={q.question} className="text-[17px] font-medium leading-relaxed text-slate-900 sm:text-lg" />

        <div className="mt-5 space-y-2.5" role="group" aria-label="Pilihan jawaban">
          {sq.options.map((o) => (
            <OptionButton
              key={o.originalId}
              option={o}
              isTkp={q.category === 'TKP'}
              answered={answered}
              selectedId={answer?.selectedOriginalId ?? null}
              correctId={q.category === 'TKP' ? null : q.correctAnswer}
              onSelect={onAnswer}
            />
          ))}
        </div>
        {!answered && (
          <p className="mt-3 hidden text-xs text-slate-500 sm:block">
            Tekan 1–5 atau A–E untuk memilih. Jawaban langsung dikunci setelah dipilih.
          </p>
        )}
      </article>

      {answered && answer && (
        <div className="mt-4 space-y-4">
          <FeedbackPanel ref={feedbackRef} sq={sq} answer={answer} />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="hidden text-xs text-slate-500 sm:block">Tekan Enter untuk lanjut.</p>
            <button type="button" className="btn-primary w-full sm:w-auto" onClick={onNext}>
              {isLast ? 'Lihat Hasil' : 'Soal Berikutnya →'}
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmExit}
        title="Keluar dari latihan?"
        message="Jawaban di sesi ini tidak akan disimpan dan kamu akan kembali ke layar mulai."
        confirmLabel="Ya, Keluar"
        cancelLabel="Lanjutkan Latihan"
        danger
        onConfirm={() => {
          setConfirmExit(false);
          onExit();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}
