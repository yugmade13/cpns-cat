import { useCallback, useState } from 'react';
import { Footer } from './components/OfficialNotice';
import { QuestionScreen } from './components/QuestionScreen';
import { ResultScreen } from './components/ResultScreen';
import { StartScreen } from './components/StartScreen';
import { useBank } from './hooks/useBank';
import { useQuizSession } from './hooks/useQuizSession';
import { useStoredIds } from './hooks/useStoredIds';
import { filterQuestions, requestedCount } from './lib/filter';
import { CATEGORY_FILTER_LABEL } from './lib/labels';
import { evaluateAnswer } from './lib/scoring';
import { buildSession } from './lib/shuffle';
import type { OptionId, SessionConfig, WeakTopic } from './types';

const DEFAULT_CONFIG: SessionConfig = {
  category: 'TWK',
  topic: 'ALL',
  difficulty: 'ALL',
  count: 10,
  timer: 0,
  source: 'all',
};

const SOURCE_TITLE = { all: '', bookmark: ' · Bookmark', wrong: ' · Pernah Salah' } as const;

export default function App() {
  const bank = useBank();
  const stored = useStoredIds();
  const [quiz, dispatch] = useQuizSession();
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);

  const startWith = useCallback(
    (cfg: SessionConfig, title: string) => {
      const lists = { bookmarks: stored.bookmarks, wrong: stored.wrong };
      const matching = filterQuestions(bank.all, cfg, lists);
      const requested = requestedCount(cfg, matching.length);
      const questions = buildSession(matching, requested);
      if (questions.length === 0) return;
      const notice =
        questions.length < requested
          ? `Hanya tersedia ${questions.length} soal yang cocok dari ${requested} yang diminta, jadi latihan ini berisi ${questions.length} soal.`
          : null;
      dispatch({ type: 'start', config: cfg, title, questions, notice });
    },
    [bank.all, stored.bookmarks, stored.wrong, dispatch],
  );

  const handleStart = (cfg: SessionConfig) => {
    setConfig(cfg);
    const topic = cfg.topic === 'ALL' ? '' : ` · ${cfg.topic}`;
    startWith(cfg, `Latihan ${CATEGORY_FILTER_LABEL[cfg.category]}${topic}${SOURCE_TITLE[cfg.source]}`);
  };

  const { markWrong, markRight } = stored;

  const handleAnswer = useCallback(
    (originalId: OptionId) => {
      if (!quiz || quiz.answers[quiz.index]) return;
      const sq = quiz.questions[quiz.index]!;
      dispatch({ type: 'answer', originalId });
      // Simpan ID soal yang salah (atau skor TKP < 4); hapus dari daftar jika kini benar.
      const { needsReview } = evaluateAnswer(sq, { selectedOriginalId: originalId, timedOut: false });
      if (needsReview) markWrong(sq.question.id);
      else markRight(sq.question.id);
    },
    [quiz, dispatch, markWrong, markRight],
  );

  const handleTimeout = useCallback(() => {
    if (!quiz || quiz.answers[quiz.index]) return;
    dispatch({ type: 'timeout' });
    markWrong(quiz.questions[quiz.index]!.question.id);
  }, [quiz, dispatch, markWrong]);

  const handleNext = useCallback(() => dispatch({ type: 'next' }), [dispatch]);
  const handleExit = useCallback(() => dispatch({ type: 'exit' }), [dispatch]);

  const handleRetryWrong = (ids: string[]) => {
    if (!quiz) return;
    const set = new Set(ids);
    const questions = buildSession(
      quiz.questions.map((sq) => sq.question).filter((q) => set.has(q.id)),
      ids.length,
    );
    if (questions.length === 0) return;
    dispatch({ type: 'start', config: quiz.config, title: 'Ulangi Soal yang Salah', questions, notice: null });
  };

  const handlePracticeTopic = (t: WeakTopic) => {
    const cfg: SessionConfig = { ...config, source: 'all', category: t.category, topic: t.topic, difficulty: 'ALL', count: 10 };
    setConfig(cfg);
    startWith(cfg, `Latihan ${t.category} · ${t.topic}`);
  };

  const isBookmarked = useCallback((id: string) => stored.bookmarks.includes(id), [stored.bookmarks]);

  let body: React.ReactNode;
  if (bank.state.status === 'loading') {
    body = (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-slate-600" role="status">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-navy-100 border-t-navy-700" aria-hidden="true" />
        Memuat bank soal…
      </div>
    );
  } else if (bank.state.status === 'error') {
    body = (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold text-navy-900">Bank soal belum bisa dimuat</h1>
        <p className="text-slate-600">
          Periksa koneksi internet kamu, lalu coba lagi. Jika masalah berlanjut, berkas soal mungkin sedang bermasalah.
        </p>
        <p className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-600">{bank.state.message}</p>
        <button type="button" className="btn-primary" onClick={bank.retry}>
          Coba Lagi
        </button>
      </div>
    );
  } else if (!quiz) {
    body = (
      <StartScreen
        all={bank.all}
        importedCount={bank.imported.length}
        stored={stored}
        config={config}
        onConfigChange={setConfig}
        onStart={handleStart}
        onImport={bank.importFile}
        onClearImported={bank.clearImported}
      />
    );
  } else if (!quiz.finished) {
    body = (
      <QuestionScreen
        key={quiz.title + quiz.questions.map((q) => q.question.id).join()}
        quiz={quiz}
        bookmarkEnabled={stored.available}
        isBookmarked={isBookmarked}
        onToggleBookmark={stored.toggleBookmark}
        onAnswer={handleAnswer}
        onTimeout={handleTimeout}
        onNext={handleNext}
        onExit={handleExit}
      />
    );
  } else {
    body = (
      <ResultScreen
        quiz={quiz}
        bookmarkEnabled={stored.available}
        isBookmarked={isBookmarked}
        onToggleBookmark={stored.toggleBookmark}
        onRetryWrong={handleRetryWrong}
        onPracticeTopic={handlePracticeTopic}
        onNewSession={handleExit}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">{body}</main>
      <Footer />
    </div>
  );
}
