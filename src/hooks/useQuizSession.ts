import { useReducer } from 'react';
import type { AnswerRecord, OptionId, SessionConfig, SessionQuestion } from '../types';

export interface QuizState {
  config: SessionConfig;
  /** Judul sesi, mis. "Latihan TWK" atau "Ulangi Soal yang Salah". */
  title: string;
  questions: SessionQuestion[];
  answers: (AnswerRecord | null)[];
  index: number;
  finished: boolean;
  /** Pemberitahuan saat soal yang tersedia lebih sedikit dari permintaan. */
  notice: string | null;
}

export type QuizAction =
  | { type: 'start'; config: SessionConfig; title: string; questions: SessionQuestion[]; notice: string | null }
  | { type: 'answer'; originalId: OptionId }
  | { type: 'timeout' }
  | { type: 'next' }
  | { type: 'exit' };

export function quizReducer(state: QuizState | null, action: QuizAction): QuizState | null {
  if (action.type === 'start') {
    if (action.questions.length === 0) return state;
    return {
      config: action.config,
      title: action.title,
      questions: action.questions,
      answers: action.questions.map(() => null),
      index: 0,
      finished: false,
      notice: action.notice,
    };
  }
  if (action.type === 'exit') return null;
  if (!state || state.finished) return state;

  const current = state.answers[state.index];
  switch (action.type) {
    case 'answer':
    case 'timeout': {
      if (current) return state; // jawaban sudah dikunci
      const record: AnswerRecord =
        action.type === 'answer'
          ? { selectedOriginalId: action.originalId, timedOut: false }
          : { selectedOriginalId: null, timedOut: true };
      const answers = [...state.answers];
      answers[state.index] = record;
      return { ...state, answers };
    }
    case 'next': {
      if (!current) return state; // belum dijawab, tidak boleh lanjut
      if (state.index >= state.questions.length - 1) return { ...state, finished: true };
      return { ...state, index: state.index + 1, notice: null };
    }
    default:
      return state;
  }
}

export function useQuizSession() {
  return useReducer(quizReducer, null);
}
