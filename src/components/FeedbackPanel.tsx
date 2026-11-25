import { forwardRef } from 'react';
import { evaluateAnswer } from '../lib/scoring';
import { relabelText } from '../lib/shuffle';
import type { AnswerRecord, ChoiceQuestion, SessionQuestion, TkpQuestion } from '../types';
import { AlertIcon, BoltIcon, CheckIcon, ClockIcon, XIcon } from './Icons';
import { RichText } from './RichText';

interface Props {
  sq: SessionQuestion;
  answer: AnswerRecord;
}

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <h3 className="mb-1.5 text-sm font-bold uppercase tracking-wide text-brand-ink">{title}</h3>
      <div className="text-[15px] leading-relaxed text-slate-700 sm:text-base">{children}</div>
    </section>
  );
}

export const FeedbackPanel = forwardRef<HTMLDivElement, Props>(function FeedbackPanel({ sq, answer }, ref) {
  const q = sq.question;
  return (
    <div ref={ref} className="card scroll-mt-4 space-y-5 p-4 sm:p-6" aria-live="polite">
      {q.category === 'TKP' ? <TkpFeedback sq={sq} q={q} answer={answer} /> : <ChoiceFeedback sq={sq} q={q} answer={answer} />}
    </div>
  );
});

function ChoiceFeedback({ sq, q, answer }: { sq: SessionQuestion; q: ChoiceQuestion; answer: AnswerRecord }) {
  const ev = evaluateAnswer(sq, answer);
  const correctLabel = sq.options.find((o) => o.originalId === q.correctAnswer)!.label;
  const labelOf = (originalId: string) => sq.options.find((o) => o.originalId === originalId);
  const others = sq.options.filter((o) => o.originalId !== q.correctAnswer && q.optionNotes[o.originalId]);
  const isNumeric = q.category === 'TIU' && q.subtype === 'numerik';
  const isReasoning = q.category === 'TIU' && (q.subtype === 'verbal' || q.subtype === 'logika');

  const banner =
    ev.status === 'correct' ? (
      <div className="flex items-center gap-3 rounded-lg bg-green-50 p-3 text-green-900 ring-1 ring-green-200">
        <CheckIcon className="h-6 w-6 shrink-0" />
        <p className="font-semibold">Benar! +{ev.points} poin.</p>
      </div>
    ) : ev.status === 'wrong' ? (
      <div className="flex items-center gap-3 rounded-lg bg-red-50 p-3 text-red-900 ring-1 ring-red-200">
        <XIcon className="h-6 w-6 shrink-0" />
        <p className="font-semibold">
          Kurang tepat. Kamu memilih {labelOf(answer.selectedOriginalId!)?.label}, jawaban benar adalah {correctLabel}.
        </p>
      </div>
    ) : (
      <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
        <ClockIcon className="h-6 w-6 shrink-0" />
        <p className="font-semibold">Waktu habis, soal tidak terjawab. Jawaban benar adalah {correctLabel}.</p>
      </div>
    );

  return (
    <>
      {banner}
      <Section title={isReasoning ? 'Alur Penalaran' : 'Pembahasan'}>
        <RichText text={relabelText(q.explanation, sq)} />
      </Section>

      {q.reference && (
        <Section title={q.category === 'TWK' ? 'Dasar dan Rujukan' : 'Rujukan'} className="rounded-lg bg-brand-50 p-3">
          <p>{q.reference}</p>
        </Section>
      )}

      {q.solutionSteps.length > 0 && (
        <Section title="Langkah Penyelesaian">
          <ol className="list-decimal space-y-1 pl-5 marker:font-semibold marker:text-brand-ink">
            {q.solutionSteps.map((s, i) => (
              <li key={i} className="wrap-break-word">
                {s}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {q.shortcut && (
        <div className="rounded-lg border-l-4 border-brand bg-brand-50 p-3 sm:p-4">
          <h3 className="mb-1 flex items-center gap-1.5 text-sm font-bold uppercase tracking-wide text-brand-ink">
            <BoltIcon className="h-4 w-4" /> Cara Cepat
          </h3>
          <p className="text-[15px] leading-relaxed text-slate-800 sm:text-base">{q.shortcut}</p>
        </div>
      )}

      {q.timeTip && (
        <p className="flex items-start gap-2 text-[15px] text-slate-700">
          <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-ink" />
          <span>
            <strong className="text-brand-ink">Tips Hemat Waktu:</strong> {q.timeTip}
          </span>
        </p>
      )}

      {others.length > 0 && (
        <Section title={isNumeric ? 'Mengapa Opsi Lain Salah' : 'Mengapa Opsi Lain Kurang Tepat'}>
          <ul className="space-y-2">
            {others.map((o) => (
              <li key={o.originalId} className="flex gap-2">
                <span className="font-bold text-slate-500">{o.label}.</span>
                <span className="min-w-0 wrap-break-word">
                  <span className="font-medium text-slate-800">{o.text}</span>
                  <span className="text-slate-600"> — {relabelText(q.optionNotes[o.originalId] ?? '', sq)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}

function TkpFeedback({ sq, q, answer }: { sq: SessionQuestion; q: TkpQuestion; answer: AnswerRecord }) {
  const ev = evaluateAnswer(sq, answer);
  const selected = sq.options.find((o) => o.originalId === answer.selectedOriginalId);
  const sorted = [...sq.options].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const best = sorted[0]!;

  return (
    <>
      {selected ? (
        <div
          className={`flex items-center gap-3 rounded-lg p-3 ring-1 ${
            ev.points >= 4 ? 'bg-green-50 text-green-900 ring-green-200' : 'bg-amber-50 text-amber-900 ring-amber-200'
          }`}
        >
          {ev.points >= 4 ? <CheckIcon className="h-6 w-6 shrink-0" /> : <AlertIcon className="h-6 w-6 shrink-0" />}
          <p className="font-semibold">
            Skor pilihanmu ({selected.label}): {ev.points} dari 5.
            {ev.points === 5 ? ' Ini pilihan terbaik.' : ` Pilihan terbaik adalah ${best.label}.`}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
          <ClockIcon className="h-6 w-6 shrink-0" />
          <p className="font-semibold">Waktu habis, soal tidak terjawab (skor 0). Pilihan terbaik adalah {best.label}.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Section title="Kompetensi yang Diuji" className="rounded-lg bg-brand-50 p-3">
          <p>{q.competency || '—'}</p>
        </Section>
        <Section title="Prinsip Perilaku" className="rounded-lg bg-brand-50 p-3">
          <p>{q.principle || '—'}</p>
        </Section>
      </div>

      <Section title="Skor Semua Opsi (dari tertinggi)">
        <ul className="space-y-2">
          {sorted.map((o) => {
            const mine = o.originalId === answer.selectedOriginalId;
            return (
              <li
                key={o.originalId}
                className={`flex gap-3 rounded-lg border p-3 ${mine ? 'border-brand bg-brand-50' : 'border-slate-200'}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-white ${
                    o.score === 5 ? 'bg-green-700' : o.score === 4 ? 'bg-green-600' : o.score === 3 ? 'bg-slate-500' : 'bg-slate-400'
                  }`}
                  aria-label={`Skor ${o.score}`}
                >
                  <span className="text-base font-bold leading-none">{o.score}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="wrap-break-word font-medium text-slate-800">
                    <span className="font-bold text-slate-500">{o.label}.</span> {o.text}
                    {mine && <span className="chip ml-2 bg-brand text-white">Pilihanmu</span>}
                  </p>
                  <p className="mt-1 wrap-break-word text-slate-600">{relabelText(o.explanation ?? '', sq)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {q.whyBest && (
        <Section title="Mengapa Opsi Terbaik Paling Tepat">
          <p>{relabelText(q.whyBest, sq)}</p>
        </Section>
      )}
      {q.lesson && (
        <Section title="Pelajaran untuk Dunia Kerja" className="rounded-lg border-l-4 border-amber-500 bg-amber-50 p-3">
          <p>{q.lesson}</p>
        </Section>
      )}
    </>
  );
}
