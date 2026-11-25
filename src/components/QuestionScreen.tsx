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
  onPrev: () => void;
  onGoto: (index: number) => void;
  onToggleFlag: () => void;
  /** Mode Ujian: mengakhiri ujian. */
  onFinish: () => void;
  onExit: () => void;
}

const KEY_TO_INDEX: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, a: 0, b: 1, c: 2, d: 3, e: 4 };

export function QuestionScreen({
  quiz,
  bookmarkEnabled,
  isBookmarked,
  onToggleBookmark,
  onAnswer,
  onExpire,
  onNext,
  onPrev,
  onGoto,
  onToggleFlag,
  onFinish,
  onExit,
}: Props) {
  const exam = quiz.config.mode === 'exam';
  const sq = quiz.questions[quiz.index]!;
  const q = sq.question;
  const answer = quiz.answers[quiz.index] ?? null;
  // Mode Latihan: soal terkunci setelah dijawab dan pembahasan tampil. Mode Ujian: tidak pernah terkunci.
  const locked = !exam && answer !== null;
  const total = quiz.questions.length;
  const isLast = quiz.index === total - 1;
  const flagged = quiz.flags[quiz.index] ?? false;
  const answeredCount = quiz.answers.filter((a) => a !== null).length;
  const flaggedCount = quiz.flags.filter(Boolean).length;
  const [confirm, setConfirm] = useState<'exit' | 'finish' | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  // Timer total sesi: berjalan terus lintas soal sampai sesi selesai.
  const remaining = useCountdown(quiz.deadline, onExpire);

  // Kembali ke atas saat pindah soal.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [quiz.index]);

  // Mode Latihan: gulir ke umpan balik setelah menjawab.
  useEffect(() => {
    if (locked) feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [locked]);

  const closeConfirm = useCallback(() => setConfirm(null), []);

  // Pintasan keyboard: 1–5 / A–E memilih opsi, Enter lanjut; Mode Ujian juga panah kiri/kanan.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirm || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      const onButton = target && (target.tagName === 'BUTTON' || target.tagName === 'A');
      const idx = KEY_TO_INDEX[e.key.toLowerCase()];
      if (!locked && idx !== undefined) {
        e.preventDefault();
        onAnswer(sq.options[idx]!.originalId);
      } else if (exam && e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      } else if (exam && e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'Enter' && !onButton && (exam || locked)) {
        // Biarkan tombol yang sedang fokus menangani Enter sendiri.
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, exam, confirm, onAnswer, onNext, onPrev, sq]);

  const progress = exam ? (answeredCount / total) * 100 : ((quiz.index + (locked ? 1 : 0)) / total) * 100;
  const sub = subtypeLabel(q);
  const bookmarked = isBookmarked(q.id);
  const lowTime = remaining !== null && remaining <= 60;
  const unansweredCount = total - answeredCount;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-8 pt-3 sm:px-6 sm:pt-6">
      {/* Header */}
      <div className="sticky top-0 z-10 -mx-3 mb-4 border-b border-slate-200 bg-white/95 px-3 pb-3 pt-2 backdrop-blur sm:mx-0 sm:rounded-b-xl sm:px-0">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="btn-ghost -ml-2" onClick={() => setConfirm('exit')}>
            ← Keluar
          </button>
          <p className="text-sm font-semibold text-brand-ink" aria-live="polite">
            Soal {quiz.index + 1} dari {total}
          </p>
          {remaining !== null ? (
            <p
              className={`flex min-w-[4.5rem] items-center justify-end gap-1 text-sm font-bold tabular-nums ${
                lowTime ? 'rounded-md bg-red-50 px-1.5 text-red-700' : 'text-brand-ink'
              }`}
              role="timer"
              aria-label={`Sisa waktu ${Math.floor(remaining / 60)} menit ${remaining % 60} detik`}
            >
              <ClockIcon className="h-4 w-4" />
              {formatClock(remaining)}
            </p>
          ) : (
            <span className="min-w-[4.5rem]" />
          )}
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={exam ? `Terjawab ${answeredCount} dari ${total}` : 'Kemajuan latihan'}
        >
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
        {exam && (
          <p className="mt-1 text-xs text-slate-600">
            Terjawab {answeredCount} dari {total}
            {flaggedCount > 0 && ` · Ragu-ragu ${flaggedCount}`}
          </p>
        )}
      </div>

      <article className="card p-4 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="chip bg-brand text-white">{q.category}</span>
          {sub && <span className="chip bg-brand-100 text-brand-ink">{sub}</span>}
          <span className="chip bg-brand-50 text-brand-ink">{q.topic}</span>
          <span className="chip bg-slate-100 text-slate-700">{DIFFICULTY_LABEL[q.difficulty]}</span>
          {flagged && <span className="chip bg-amber-100 text-amber-900">Ragu-ragu</span>}
          {bookmarkEnabled && (
            <button
              type="button"
              className={`ml-auto inline-flex min-h-10 items-center gap-1 rounded-lg px-2 text-sm font-semibold ${
                bookmarked ? 'text-amber-700' : 'text-slate-500 hover:text-brand'
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
              answered={locked}
              examMode={exam}
              selectedId={answer?.selectedOriginalId ?? null}
              correctId={q.category === 'TKP' ? null : q.correctAnswer}
              onSelect={onAnswer}
            />
          ))}
        </div>
        {!locked && (
          <p className="mt-3 hidden text-xs text-slate-500 sm:block">
            {exam
              ? 'Tekan 1–5 atau A–E untuk memilih (jawaban masih bisa diganti), panah kiri/kanan untuk pindah soal.'
              : 'Tekan 1–5 atau A–E untuk memilih. Jawaban langsung dikunci setelah dipilih.'}
          </p>
        )}
      </article>

      {exam ? (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <button type="button" className="btn-secondary whitespace-nowrap px-1 text-sm sm:text-[15px]" disabled={quiz.index === 0} onClick={onPrev}>
              ← Sebelumnya
            </button>
            <button
              type="button"
              aria-pressed={flagged}
              onClick={onToggleFlag}
              className={`inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-lg border px-1 text-sm font-semibold transition-colors sm:text-[15px] ${
                flagged ? 'border-amber-500 bg-amber-400 text-amber-950' : 'border-amber-400 bg-white text-amber-800 hover:bg-amber-50'
              }`}
            >
              Ragu-ragu
            </button>
            {isLast ? (
              <button type="button" className="btn-primary whitespace-nowrap px-1 text-sm sm:text-[15px]" onClick={() => setConfirm('finish')}>
                Selesai
              </button>
            ) : (
              <button type="button" className="btn-primary whitespace-nowrap px-1 text-sm sm:text-[15px]" onClick={onNext}>
                Berikutnya →
              </button>
            )}
          </div>

          <section className="card p-4" aria-label="Nomor soal">
            <h2 className="mb-3 text-sm font-semibold text-brand-ink">Nomor Soal</h2>
            <div className="grid grid-cols-6 gap-2 sm:grid-cols-10">
              {quiz.questions.map((s, i) => {
                const isAnswered = quiz.answers[i] !== null;
                const isFlagged = quiz.flags[i];
                const isCurrent = i === quiz.index;
                const tone = isFlagged
                  ? 'border-amber-500 bg-amber-400 text-amber-950'
                  : isAnswered
                    ? 'border-brand bg-brand text-white'
                    : 'border-slate-300 bg-white text-brand-ink hover:bg-brand-50';
                const state = [isAnswered ? 'terjawab' : 'belum dijawab', isFlagged ? 'ragu-ragu' : ''].filter(Boolean).join(', ');
                return (
                  <button
                    key={s.question.id}
                    type="button"
                    onClick={() => onGoto(i)}
                    aria-current={isCurrent ? 'step' : undefined}
                    aria-label={`Soal ${i + 1}, ${state}`}
                    className={`min-h-10 rounded-lg border text-sm font-bold tabular-nums ${tone} ${
                      isCurrent ? 'ring-2 ring-brand ring-offset-2' : ''
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-brand bg-brand" aria-hidden="true" /> Terjawab
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-amber-500 bg-amber-400" aria-hidden="true" /> Ragu-ragu
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded border border-slate-300 bg-white" aria-hidden="true" /> Belum dijawab
              </li>
            </ul>
            <button type="button" className="btn-secondary mt-4 w-full" onClick={() => setConfirm('finish')}>
              Selesai Ujian
            </button>
          </section>
        </div>
      ) : (
        locked &&
        answer && (
          <div className="mt-4 space-y-4">
            <FeedbackPanel ref={feedbackRef} sq={sq} answer={answer} />
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="hidden text-xs text-slate-500 sm:block">Tekan Enter untuk lanjut.</p>
              <button type="button" className="btn-primary w-full sm:w-auto" onClick={onNext}>
                {isLast ? 'Lihat Hasil' : 'Soal Berikutnya →'}
              </button>
            </div>
          </div>
        )
      )}

      <ConfirmDialog
        open={confirm === 'exit'}
        title={exam ? 'Keluar dari ujian?' : 'Keluar dari latihan?'}
        message="Jawaban di sesi ini tidak akan disimpan dan kamu akan kembali ke layar mulai."
        confirmLabel="Ya, Keluar"
        cancelLabel={exam ? 'Lanjutkan Ujian' : 'Lanjutkan Latihan'}
        danger
        onConfirm={() => {
          setConfirm(null);
          onExit();
        }}
        onCancel={closeConfirm}
      />
      <ConfirmDialog
        open={confirm === 'finish'}
        title="Selesaikan ujian?"
        message={
          unansweredCount > 0 || flaggedCount > 0
            ? `Masih ada ${unansweredCount} soal belum dijawab${flaggedCount > 0 ? ` dan ${flaggedCount} soal ditandai ragu-ragu` : ''}. Soal yang belum dijawab dihitung tidak terjawab. Jawaban tidak bisa diubah lagi setelah ujian selesai.`
            : 'Semua soal sudah dijawab. Jawaban tidak bisa diubah lagi setelah ujian selesai.'
        }
        confirmLabel="Ya, Selesai"
        cancelLabel="Periksa Lagi"
        onConfirm={() => {
          setConfirm(null);
          onFinish();
        }}
        onCancel={closeConfirm}
      />
    </div>
  );
}
