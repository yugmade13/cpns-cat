import { useMemo, useState } from 'react';
import type { QuizState } from '../hooks/useQuizSession';
import { CATEGORY_NAME } from '../lib/labels';
import { summarizeSession, topicAdvice } from '../lib/scoring';
import type { CategorySummary, WeakTopic } from '../types';
import { ClockIcon, StarIcon } from './Icons';
import { ReviewList } from './ReviewList';

interface Props {
  quiz: QuizState;
  bookmarkEnabled: boolean;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
  onRetryWrong: (ids: string[]) => void;
  onPracticeTopic: (t: WeakTopic) => void;
  onNewSession: () => void;
}

function Stat({ label, value, tone = 'text-navy-900' }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center ring-1 ring-slate-200">
      <p className={`text-xl font-bold tabular-nums sm:text-2xl ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium text-slate-600">{label}</p>
    </div>
  );
}

function CategoryCard({ c }: { c: CategorySummary }) {
  return (
    <section className="card p-4 sm:p-5">
      <h3 className="mb-3 flex flex-wrap items-baseline gap-x-2 font-semibold text-navy-900">
        <span className="chip bg-navy-800 text-white">{c.category}</span>
        <span className="text-sm text-slate-600">{CATEGORY_NAME[c.category]}</span>
        <span className="ml-auto text-sm text-slate-500">{c.total} soal</span>
      </h3>
      {c.kind === 'choice' ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          <Stat label="Skor (benar × 5)" value={`${c.score}/${c.maxScore}`} />
          <Stat label="Benar" value={c.correct} tone="text-green-700" />
          <Stat label="Salah" value={c.wrong} tone="text-red-700" />
          <Stat label="Tidak terjawab" value={c.unanswered} tone="text-amber-700" />
          <Stat label="Persentase" value={`${c.percent}%`} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Total skor" value={c.score} />
          <Stat label="Rata-rata per soal" value={c.average.toLocaleString('id-ID')} />
          <Stat label="Skor maksimum" value={c.maxScore} />
          <Stat label="Tidak terjawab" value={c.unanswered} tone="text-amber-700" />
        </div>
      )}
    </section>
  );
}

export function ResultScreen({ quiz, bookmarkEnabled, isBookmarked, onToggleBookmark, onRetryWrong, onPracticeTopic, onNewSession }: Props) {
  const [view, setView] = useState<'summary' | 'review'>('summary');
  const summary = useMemo(() => summarizeSession(quiz.questions, quiz.answers), [quiz]);
  const pct = summary.maxScore ? Math.round((summary.totalScore / summary.maxScore) * 100) : 0;
  const achievement = pct >= 80;
  const unansweredCount = quiz.answers.filter((a) => !a || a.selectedOriginalId === null).length;

  if (view === 'review') {
    return (
      <div className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-navy-900">Tinjau Semua Jawaban</h1>
          <button type="button" className="btn-secondary" onClick={() => setView('summary')}>
            ← Kembali ke Hasil
          </button>
        </div>
        <p className="mb-3 text-sm text-slate-600">Ketuk soal untuk melihat jawabanmu, kunci, dan pembahasannya.</p>
        <ReviewList
          questions={quiz.questions}
          answers={quiz.answers}
          bookmarkEnabled={bookmarkEnabled}
          isBookmarked={isBookmarked}
          onToggleBookmark={onToggleBookmark}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-6 sm:py-6">
      <section
        className={`card overflow-hidden p-5 text-center sm:p-7 ${achievement ? 'border-amber-300 ring-1 ring-amber-300' : ''}`}
      >
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Hasil Latihan · {quiz.title}</p>
        {achievement && (
          <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
            <StarIcon className="h-4 w-4 text-amber-500" /> Pencapaian bagus!
          </p>
        )}
        <p className="mt-3 text-5xl font-extrabold tabular-nums text-navy-900">
          {summary.totalScore}
          <span className="text-2xl font-bold text-slate-400"> / {summary.maxScore}</span>
        </p>
        <p className="mt-1 text-slate-600">
          Total skor sesi ({pct}% dari skor maksimum, {quiz.questions.length} soal)
        </p>
      </section>

      {quiz.expired && (
        <p role="status" className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-[15px] text-amber-900 ring-1 ring-amber-200">
          <ClockIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <span>
            <strong>Waktu habis.</strong> {unansweredCount} soal belum sempat dijawab dan dihitung tidak terjawab. Kunci dan
            pembahasannya ada di "Tinjau Semua Jawaban".
          </span>
        </p>
      )}

      {summary.categories.map((c) => (
        <CategoryCard key={c.category} c={c} />
      ))}

      <section className="card p-4 sm:p-5">
        <h2 className="mb-3 font-semibold text-navy-900">Topik yang Perlu Diperkuat</h2>
        {summary.weakTopics.length === 0 ? (
          <p className="text-[15px] text-slate-600">
            Semua soal di sesi ini terjawab dengan baik. Coba naikkan tingkat kesulitan atau tambah jumlah soal.
          </p>
        ) : (
          <ul className="space-y-3">
            {summary.weakTopics.slice(0, 5).map((t) => (
              <li key={`${t.category}-${t.topic}`} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200 sm:flex-row sm:items-center">
                <p className="flex-1 text-[15px] text-slate-700">
                  <span className="chip mr-1.5 bg-navy-100 text-navy-800">{t.category}</span>
                  {topicAdvice(t)}
                </p>
                <button type="button" className="btn-secondary min-h-10 shrink-0 px-4 text-sm" onClick={() => onPracticeTopic(t)}>
                  Latihan Topik Ini
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          className="btn-primary"
          disabled={summary.reviewIds.length === 0}
          onClick={() => onRetryWrong(summary.reviewIds)}
        >
          Ulangi Soal yang Salah{summary.reviewIds.length > 0 ? ` (${summary.reviewIds.length})` : ''}
        </button>
        <button type="button" className="btn-secondary" onClick={() => setView('review')}>
          Tinjau Semua Jawaban
        </button>
        <button type="button" className="btn-secondary" onClick={onNewSession}>
          Latihan Baru
        </button>
      </div>
      {summary.reviewIds.length === 0 && (
        <p className="text-center text-sm text-slate-500">Tidak ada soal yang salah atau ber-skor TKP di bawah 4 untuk diulang.</p>
      )}
    </div>
  );
}
