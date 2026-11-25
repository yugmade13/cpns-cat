import { useCallback, useState } from 'react';
import { Footer } from './components/Footer';
import { QuestionScreen } from './components/QuestionScreen';
import { ResultScreen } from './components/ResultScreen';
import { StartScreen, type PracticeSelection } from './components/StartScreen';
import { UploadScreen } from './components/UploadScreen';
import { useBank } from './hooks/useBank';
import { useQuizSession } from './hooks/useQuizSession';
import { useStoredIds } from './hooks/useStoredIds';
import { evaluateAnswer } from './lib/scoring';
import { buildSession } from './lib/shuffle';
import type { QuizState } from './hooks/useQuizSession';
import type { OptionId, Question, SessionMode, TimerSetting, WeakTopic } from './types';

export default function App() {
  const bank = useBank();
  const stored = useStoredIds();
  const [quiz, dispatch] = useQuizSession();
  // Pilihan di layar mulai, diingat antarsesi selama aplikasi terbuka.
  const [timer, setTimer] = useState<TimerSetting>(0);
  const [mode, setMode] = useState<SessionMode>('practice');
  const [practiceKey, setPracticeKey] = useState('all');

  /** Mulai sesi dari daftar soal (diacak) dengan waktu latihan yang sedang dipilih. */
  const start = (list: Question[], title: string) => {
    const questions = buildSession(list, list.length);
    if (questions.length === 0) return;
    dispatch({ type: 'start', config: { timer, mode }, title, questions, now: Date.now() });
    bank.dismissReport(); // laporan unggahan tidak relevan lagi setelah latihan dimulai
  };

  const handleStart = (sel: PracticeSelection) => start(sel.questions, sel.title);

  const { markWrong, markRight } = stored;

  /** Mode Ujian: catat soal salah/benar ke daftar "Pernah Salah" saat ujian berakhir (jawaban final). */
  const recordExam = useCallback(
    (q: QuizState) => {
      q.questions.forEach((sq, i) => {
        const a = q.answers[i];
        if (!a) return; // soal yang tidak dijawab tidak dicatat
        if (evaluateAnswer(sq, a).needsReview) markWrong(sq.question.id);
        else markRight(sq.question.id);
      });
    },
    [markWrong, markRight],
  );

  const handleAnswer = useCallback(
    (originalId: OptionId) => {
      if (!quiz) return;
      if (quiz.config.mode === 'exam') {
        dispatch({ type: 'answer', originalId });
        return;
      }
      if (quiz.answers[quiz.index]) return;
      const sq = quiz.questions[quiz.index]!;
      dispatch({ type: 'answer', originalId });
      // Simpan ID soal yang salah (atau skor TKP < 4); hapus dari daftar jika kini benar.
      const { needsReview } = evaluateAnswer(sq, { selectedOriginalId: originalId });
      if (needsReview) markWrong(sq.question.id);
      else markRight(sq.question.id);
    },
    [quiz, dispatch, markWrong, markRight],
  );

  /** Waktu sesi habis: sisa soal dihitung tidak terjawab dan sesi langsung selesai. */
  const handleExpire = useCallback(() => {
    if (!quiz || quiz.finished) return;
    if (quiz.config.mode === 'exam') recordExam(quiz);
    // Mode Latihan: soal yang sedang tampil dan belum dijawab dicatat sebagai "pernah salah".
    else if (!quiz.answers[quiz.index]) markWrong(quiz.questions[quiz.index]!.question.id);
    dispatch({ type: 'expire' });
  }, [quiz, dispatch, markWrong, recordExam]);

  const handleFinish = useCallback(() => {
    if (!quiz || quiz.finished) return;
    recordExam(quiz);
    dispatch({ type: 'finish' });
  }, [quiz, dispatch, recordExam]);

  const handlePrev = useCallback(() => dispatch({ type: 'prev' }), [dispatch]);
  const handleGoto = useCallback((index: number) => dispatch({ type: 'goto', index }), [dispatch]);
  const handleToggleFlag = useCallback(() => dispatch({ type: 'toggleFlag' }), [dispatch]);

  const handleNext = useCallback(() => dispatch({ type: 'next' }), [dispatch]);
  const handleExit = useCallback(() => dispatch({ type: 'exit' }), [dispatch]);

  const handleRetryWrong = (ids: string[]) => {
    if (!quiz) return;
    const set = new Set(ids);
    start(
      quiz.questions.map((sq) => sq.question).filter((q) => set.has(q.id)),
      'Ulangi Soal yang Salah',
    );
  };

  /** Latihan semua soal pada topik yang masih sering salah (dari seluruh bank soal). */
  const handlePracticeTopic = (t: WeakTopic) =>
    start(
      bank.all.filter((q) => q.category === t.category && q.topic === t.topic),
      `${t.category} · ${t.topic}`,
    );

  const isBookmarked = useCallback((id: string) => stored.bookmarks.includes(id), [stored.bookmarks]);

  let body: React.ReactNode;
  if (bank.loading) {
    body = (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 p-6 text-slate-600" role="status">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand" aria-hidden="true" />
        Memuat bank soal…
      </div>
    );
  } else if (!quiz && bank.all.length === 0) {
    body = <UploadScreen bank={bank} />;
  } else if (!quiz) {
    body = (
      <StartScreen
        bank={bank}
        stored={stored}
        timer={timer}
        onTimerChange={setTimer}
        mode={mode}
        onModeChange={setMode}
        selectedKey={practiceKey}
        onSelect={setPracticeKey}
        onStart={handleStart}
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
        onExpire={handleExpire}
        onPrev={handlePrev}
        onGoto={handleGoto}
        onToggleFlag={handleToggleFlag}
        onFinish={handleFinish}
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
