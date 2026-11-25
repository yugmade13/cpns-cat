import { useState } from 'react';
import { DIFFICULTY_LABEL } from '../lib/labels';
import { evaluateAnswer } from '../lib/scoring';
import type { AnswerRecord, SessionQuestion } from '../types';
import { FeedbackPanel } from './FeedbackPanel';
import { BookmarkIcon, CheckIcon, ClockIcon, XIcon } from './Icons';
import { OptionButton } from './OptionButton';
import { RichText } from './RichText';

interface Props {
  questions: SessionQuestion[];
  answers: (AnswerRecord | null)[];
  bookmarkEnabled: boolean;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (id: string) => void;
}

type Filter = 'all' | 'review';

export function ReviewList({ questions, answers, bookmarkEnabled, isBookmarked, onToggleBookmark }: Props) {
  const [filter, setFilter] = useState<Filter>('all');
  const items = questions
    .map((sq, i) => ({ sq, i, answer: answers[i] ?? { selectedOriginalId: null, timedOut: true }, ev: evaluateAnswer(sq, answers[i]) }))
    .filter((x) => filter === 'all' || x.ev.needsReview);
  const reviewCount = questions.filter((sq, i) => evaluateAnswer(sq, answers[i]).needsReview).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Saring tinjauan">
        {(
          [
            ['all', `Semua (${questions.length})`],
            ['review', `Perlu Diulang (${reviewCount})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filter === value}
            onClick={() => setFilter(value)}
            className={`min-h-10 rounded-full border px-4 text-sm font-semibold ${
              filter === value ? 'border-navy-800 bg-navy-800 text-white' : 'border-slate-300 bg-white text-navy-800 hover:bg-navy-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 && <p className="card p-4 text-slate-600">Tidak ada soal yang perlu diulang. Mantap!</p>}

      {items.map(({ sq, i, answer, ev }) => {
        const q = sq.question;
        const statusEl =
          ev.status === 'correct' ? (
            <span className="chip gap-1 bg-green-100 text-green-800">
              <CheckIcon className="h-3.5 w-3.5" /> Benar
            </span>
          ) : ev.status === 'wrong' ? (
            <span className="chip gap-1 bg-red-100 text-red-800">
              <XIcon className="h-3.5 w-3.5" /> Salah
            </span>
          ) : ev.status === 'unanswered' ? (
            <span className="chip gap-1 bg-amber-100 text-amber-900">
              <ClockIcon className="h-3.5 w-3.5" /> Tidak terjawab
            </span>
          ) : (
            <span className={`chip ${ev.points >= 4 ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'}`}>
              Skor {ev.points}/5
            </span>
          );
        return (
          <details key={q.id} className="card group overflow-hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-start gap-3 p-4 hover:bg-slate-50">
              <span className="mt-0.5 text-sm font-bold text-slate-500">{i + 1}.</span>
              <span className="min-w-0 flex-1">
                <span className="mb-1 flex flex-wrap items-center gap-1.5">
                  {statusEl}
                  <span className="chip bg-navy-100 text-navy-800">{q.category}</span>
                  <span className="text-xs text-slate-500">
                    {q.topic} · {DIFFICULTY_LABEL[q.difficulty]}
                  </span>
                </span>
                <span className="line-clamp-2 text-[15px] text-slate-800">{q.question.split('\n')[0]}</span>
              </span>
              <span className="mt-1 text-slate-400 transition-transform group-open:rotate-180" aria-hidden="true">
                ▾
              </span>
            </summary>
            <div className="space-y-4 border-t border-slate-200 p-4">
              {bookmarkEnabled && (
                <button
                  type="button"
                  className={`btn-ghost -ml-2 ${isBookmarked(q.id) ? 'text-amber-700' : ''}`}
                  aria-pressed={isBookmarked(q.id)}
                  onClick={() => onToggleBookmark(q.id)}
                >
                  <BookmarkIcon className="h-4 w-4" filled={isBookmarked(q.id)} />
                  {isBookmarked(q.id) ? 'Tersimpan di Bookmark' : 'Simpan ke Bookmark'}
                </button>
              )}
              {q.category === 'TKP' && q.context && (
                <div className="rounded-lg bg-slate-50 p-3 text-slate-700 ring-1 ring-slate-200">
                  <RichText text={q.context} />
                </div>
              )}
              <RichText text={q.question} className="text-[16px] font-medium text-slate-900" />
              <div className="space-y-2">
                {sq.options.map((o) => (
                  <OptionButton
                    key={o.originalId}
                    option={o}
                    isTkp={q.category === 'TKP'}
                    answered
                    selectedId={answer.selectedOriginalId}
                    correctId={q.category === 'TKP' ? null : q.correctAnswer}
                  />
                ))}
              </div>
              <FeedbackPanel sq={sq} answer={answer} />
            </div>
          </details>
        );
      })}
    </div>
  );
}
