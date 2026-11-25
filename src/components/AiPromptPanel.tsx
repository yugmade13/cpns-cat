import { useRef, useState } from 'react';
import { buildAiPrompt, makeIdPrefix } from '../lib/aiPrompt';
import { copyText } from '../lib/clipboard';
import { CATEGORY_FILTER_LABEL } from '../lib/labels';
import { SUPPORTED_TOPICS } from '../lib/topics';
import type { CategoryFilter, Difficulty } from '../types';
import { AlertIcon, CheckIcon } from './Icons';

const CATS: CategoryFilter[] = ['TWK', 'TIU', 'TKP', 'MIX'];
const COUNTS = [5, 10, 15] as const;

const newPrefix = () => `${makeIdPrefix()}${Math.random().toString(36).slice(2, 4)}`;

export function AiPromptPanel() {
  const [category, setCategory] = useState<CategoryFilter>('MIX');
  const [count, setCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<Difficulty | 'ALL'>('ALL');
  const [topic, setTopic] = useState<string>('ALL');
  const [prefix, setPrefix] = useState(newPrefix);
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const previewRef = useRef<HTMLDetailsElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const topicChoices = category === 'MIX' ? [] : SUPPORTED_TOPICS[category];
  const prompt = buildAiPrompt({ category, count, difficulty, topic: category === 'MIX' ? 'ALL' : topic, idPrefix: prefix });
  const total = count * (category === 'MIX' ? 3 : 1);

  const copy = async () => {
    // Awalan ID baru setiap kali menyalin agar batch berikutnya tidak bentrok ID.
    const p = newPrefix();
    setPrefix(p);
    const text = buildAiPrompt({ category, count, difficulty, topic: category === 'MIX' ? 'ALL' : topic, idPrefix: p });
    const ok = await copyText(text);
    setStatus(ok ? 'copied' : 'failed');
    if (!ok && previewRef.current) {
      previewRef.current.open = true;
      setTimeout(() => textRef.current?.select(), 0);
    }
  };

  const change = (fn: () => void) => {
    fn();
    setStatus('idle');
  };

  return (
    <div className="space-y-4 text-[15px]">
      <ol className="list-decimal space-y-1 pl-5 text-slate-700">
        <li>Atur jenis soal di bawah, lalu tekan <strong>Salin Prompt</strong>.</li>
        <li>Tempel prompt ke asisten AI pilihanmu (ChatGPT, Claude, Gemini, dan lainnya).</li>
        <li>
          Unduh file <strong>.json</strong> yang dibuat AI, lalu unggah di aplikasi ini. Jika AI hanya menampilkan teks JSON,
          salin teksnya dan simpan sebagai file berakhiran <strong>.json</strong>.
        </li>
      </ol>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-brand-ink">Kategori</legend>
        <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Kategori soal AI">
          {CATS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={category === c}
              onClick={() => change(() => (setCategory(c), setTopic('ALL')))}
              className={`min-h-11 min-w-0 rounded-lg border px-0.5 text-[13px] font-semibold sm:text-sm ${
                category === c ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-brand-ink hover:bg-brand-50'
              }`}
            >
              {CATEGORY_FILTER_LABEL[c]}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand-ink">
            Jumlah{category === 'MIX' ? ' per kategori' : ''}
          </span>
          <select
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
            aria-label="Jumlah soal untuk AI"
            value={count}
            onChange={(e) => change(() => setCount(Number(e.target.value)))}
          >
            {COUNTS.map((n) => (
              <option key={n} value={n}>
                {n} soal
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand-ink">Kesulitan</span>
          <select
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3"
            aria-label="Kesulitan soal untuk AI"
            value={difficulty}
            onChange={(e) => change(() => setDifficulty(e.target.value as Difficulty | 'ALL'))}
          >
            <option value="ALL">Campuran</option>
            <option value="easy">Mudah</option>
            <option value="medium">Sedang</option>
            <option value="hard">Sulit</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold text-brand-ink">Topik</span>
          <select
            className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 disabled:bg-slate-50 disabled:text-slate-400"
            aria-label="Topik soal untuk AI"
            value={category === 'MIX' ? 'ALL' : topic}
            disabled={category === 'MIX'}
            onChange={(e) => change(() => setTopic(e.target.value))}
          >
            <option value="ALL">Beragam topik</option>
            {topicChoices.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="button" className="btn-primary" onClick={() => void copy()}>
          Salin Prompt ({total} soal)
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {status === 'copied' && (
            <span className="flex items-center gap-1.5 font-semibold text-green-800">
              <CheckIcon className="h-4 w-4" /> Prompt tersalin. Tempel ke asisten AI.
            </span>
          )}
          {status === 'failed' && (
            <span className="font-semibold text-red-800">
              Browser tidak mengizinkan salin otomatis. Salin manual dari kotak prompt di bawah.
            </span>
          )}
        </p>
      </div>

      <details ref={previewRef} className="rounded-lg ring-1 ring-slate-200">
        <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-semibold text-brand-ink">Lihat prompt</summary>
        <textarea
          ref={textRef}
          readOnly
          value={prompt}
          aria-label="Isi prompt untuk AI"
          className="block h-72 w-full resize-y border-t border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-800"
          onFocus={(e) => e.currentTarget.select()}
        />
      </details>

      <p className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          AI bisa keliru. Periksa ulang fakta TWK (pasal, tahun, tokoh) dan hitungan TIU sebelum dipakai berlatih. Jika
          jawaban AI terpotong, kurangi jumlah soal lalu salin ulang.
        </span>
      </p>
    </div>
  );
}
