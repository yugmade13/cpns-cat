import type { OptionId, SessionOption } from '../types';
import { CheckIcon, XIcon } from './Icons';

interface Props {
  option: SessionOption;
  isTkp: boolean;
  answered: boolean;
  selectedId: OptionId | null;
  correctId: OptionId | null;
  onSelect?: (originalId: OptionId) => void;
}

export function OptionButton({ option, isTkp, answered, selectedId, correctId, onSelect }: Props) {
  const isSelected = selectedId === option.originalId;
  const isCorrect = !isTkp && correctId === option.originalId;

  let tone = 'border-slate-300 bg-white hover:border-royal-500 hover:bg-royal-50';
  let letterTone = 'border-slate-300 bg-slate-50 text-navy-800';
  let status: React.ReactNode = null;
  let tkpChips: React.ReactNode = null;

  if (answered) {
    if (isTkp) {
      tone = isSelected ? 'border-royal-600 bg-royal-50 ring-1 ring-royal-600' : 'border-slate-200 bg-white';
      letterTone = isSelected ? 'border-royal-600 bg-royal-600 text-white' : 'border-slate-300 bg-slate-50 text-slate-600';
      // Untuk TKP, chip ditaruh di bawah teks agar kolom teks tetap lebar di layar HP.
      status = null;
      tkpChips = (
        <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span className={`chip ${option.score === 5 ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>
            Skor {option.score}
          </span>
          {isSelected && <span className="chip bg-royal-600 text-white">Pilihanmu</span>}
        </span>
      );
    } else if (isCorrect) {
      tone = 'border-green-600 bg-green-50 ring-1 ring-green-600';
      letterTone = 'border-green-700 bg-green-700 text-white';
      status = (
        <span className="chip gap-1 bg-green-100 text-green-800">
          <CheckIcon className="h-4 w-4" />
          {isSelected ? 'Jawabanmu benar' : 'Jawaban benar'}
        </span>
      );
    } else if (isSelected) {
      tone = 'border-red-600 bg-red-50 ring-1 ring-red-600';
      letterTone = 'border-red-700 bg-red-700 text-white';
      status = (
        <span className="chip gap-1 bg-red-100 text-red-800">
          <XIcon className="h-4 w-4" />
          Jawabanmu
        </span>
      );
    } else {
      tone = 'border-slate-200 bg-white opacity-75';
      letterTone = 'border-slate-200 bg-slate-50 text-slate-500';
    }
  }

  const content = (
    <>
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${letterTone}`}
        aria-hidden="true"
      >
        {option.label}
      </span>
      <span className="min-w-0 flex-1 wrap-break-word text-[16px] leading-relaxed">
        <span className="block">{option.text}</span>
        {tkpChips}
        {status && <span className="mt-1.5 flex">{status}</span>}
      </span>
    </>
  );

  const className = `flex min-h-12 w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors sm:px-4 ${tone}`;

  if (!onSelect) {
    return <div className={className}>{content}</div>;
  }
  return (
    <button
      type="button"
      className={`${className} ${answered ? 'cursor-default' : 'cursor-pointer'}`}
      disabled={answered}
      aria-label={`Opsi ${option.label}: ${option.text}`}
      onClick={() => onSelect(option.originalId)}
    >
      {content}
    </button>
  );
}
