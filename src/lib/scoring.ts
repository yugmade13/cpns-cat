// Penilaian jawaban dan ringkasan sesi.
import type {
  AnswerEvaluation,
  AnswerRecord,
  Category,
  CategorySummary,
  SessionQuestion,
  SessionSummary,
  WeakTopic,
} from '../types';

export const POINTS_PER_CORRECT = 5;
export const TKP_MAX_POINTS = 5;
/** Skor TKP di bawah nilai ini dianggap perlu diulang. */
export const TKP_REVIEW_THRESHOLD = 4;

export function evaluateAnswer(sq: SessionQuestion, answer: AnswerRecord | null | undefined): AnswerEvaluation {
  const q = sq.question;
  const selected = answer?.selectedOriginalId ?? null;
  if (q.category === 'TKP') {
    if (!selected) return { status: 'unanswered', points: 0, maxPoints: TKP_MAX_POINTS, needsReview: true };
    const opt = q.options.find((o) => o.id === selected);
    const points = opt?.score ?? 0;
    return { status: 'scored', points, maxPoints: TKP_MAX_POINTS, needsReview: points < TKP_REVIEW_THRESHOLD };
  }
  if (!selected) return { status: 'unanswered', points: 0, maxPoints: POINTS_PER_CORRECT, needsReview: true };
  const correct = selected === q.correctAnswer;
  return {
    status: correct ? 'correct' : 'wrong',
    points: correct ? POINTS_PER_CORRECT : 0,
    maxPoints: POINTS_PER_CORRECT,
    needsReview: !correct,
  };
}

const ORDER: Category[] = ['TWK', 'TIU', 'TKP'];

export function summarizeSession(questions: SessionQuestion[], answers: (AnswerRecord | null)[]): SessionSummary {
  const evals = questions.map((sq, i) => evaluateAnswer(sq, answers[i]));
  const categories: CategorySummary[] = [];

  for (const cat of ORDER) {
    const idx = questions.map((sq, i) => (sq.question.category === cat ? i : -1)).filter((i) => i >= 0);
    if (idx.length === 0) continue;
    const ev = idx.map((i) => evals[i]!);
    const score = ev.reduce((s, e) => s + e.points, 0);
    const maxScore = ev.reduce((s, e) => s + e.maxPoints, 0);
    const unanswered = ev.filter((e) => e.status === 'unanswered').length;
    if (cat === 'TKP') {
      const answered = idx.length - unanswered;
      categories.push({
        kind: 'tkp',
        category: 'TKP',
        total: idx.length,
        answered,
        unanswered,
        score,
        maxScore,
        // Rata-rata per soal dalam sesi (soal tidak terjawab bernilai 0).
        average: Math.round((score / idx.length) * 100) / 100,
      });
    } else {
      const correct = ev.filter((e) => e.status === 'correct').length;
      categories.push({
        kind: 'choice',
        category: cat,
        total: idx.length,
        correct,
        wrong: ev.filter((e) => e.status === 'wrong').length,
        unanswered,
        score,
        maxScore,
        percent: Math.round((correct / idx.length) * 100),
      });
    }
  }

  const topicMap = new Map<string, WeakTopic>();
  questions.forEach((sq, i) => {
    const key = `${sq.question.category}::${sq.question.topic}`;
    const t = topicMap.get(key) ?? { category: sq.question.category, topic: sq.question.topic, missed: 0, total: 0 };
    t.total++;
    if (evals[i]!.needsReview) t.missed++;
    topicMap.set(key, t);
  });
  const weakTopics = [...topicMap.values()]
    .filter((t) => t.missed > 0)
    .sort((a, b) => b.missed - a.missed || b.missed / b.total - a.missed / a.total || a.topic.localeCompare(b.topic));

  return {
    categories,
    weakTopics,
    reviewIds: questions.filter((_, i) => evals[i]!.needsReview).map((sq) => sq.question.id),
    totalScore: evals.reduce((s, e) => s + e.points, 0),
    maxScore: evals.reduce((s, e) => s + e.maxPoints, 0),
  };
}

/** Saran singkat untuk topik yang sering salah. */
export function topicAdvice(t: WeakTopic): string {
  const topic = t.topic;
  if (t.category === 'TKP') {
    return `Pilihanmu di topik ${topic} belum optimal (${t.missed} dari ${t.total} soal skornya di bawah 4). Pelajari pembahasan tiap opsi, lalu coba latihan 10 soal ${topic}.`;
  }
  return `Kamu masih sering salah di ${topic} (${t.missed} dari ${t.total} soal). Coba latihan 10 soal ${topic}.`;
}
