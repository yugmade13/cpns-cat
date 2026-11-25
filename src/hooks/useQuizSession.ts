import { useReducer } from 'react';
import type { AnswerRecord, OptionId, SessionConfig, SessionQuestion } from '../types';

export interface QuizState {
  config: SessionConfig;
  /** Judul sesi, mis. "Latihan Semua Soal" atau "Ulangi Soal yang Salah". */
  title: string;
  questions: SessionQuestion[];
  answers: (AnswerRecord | null)[];
  index: number;
  finished: boolean;
  /** Batas waktu sesi (epoch ms), atau null jika tanpa timer. */
  deadline: number | null;
  /** true jika sesi berakhir karena waktu habis. */
  expired: boolean;
}

export type QuizAction =
  | {
      type: 'start';
      config: SessionConfig;
      title: string;
      questions: SessionQuestion[];
      /** Waktu mulai (epoch ms); dipakai untuk menghitung batas waktu sesi. */
      now: number;
    }
  | { type: 'answer'; originalId: OptionId }
  | { type: 'expire' }
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
      deadline: action.config.timer > 0 ? action.now + action.config.timer * 60_000 : null,
      expired: false,
    };
  }
  if (action.type === 'exit') return null;
  if (!state || state.finished) return state;

  const current = state.answers[state.index];
  switch (action.type) {
    case 'answer': {
      if (current) return state; // jawaban sudah dikunci
      const answers = [...state.answers];
      answers[state.index] = { selectedOriginalId: action.originalId };
      return { ...state, answers };
    }
    case 'expire': {
      // Waktu sesi habis: semua soal yang belum dijawab dihitung tidak terjawab, sesi selesai.
      const answers = state.answers.map((a) => a ?? { selectedOriginalId: null });
      return { ...state, answers, finished: true, expired: true };
    }
    case 'next': {
      if (!current) return state; // belum dijawab, tidak boleh lanjut
      if (state.index >= state.questions.length - 1) return { ...state, finished: true };
      return { ...state, index: state.index + 1 };
    }
    default:
      return state;
  }
}

export function useQuizSession() {
  return useReducer(quizReducer, null);
}
