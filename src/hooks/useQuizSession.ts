import { useReducer } from 'react';
import type { AnswerRecord, OptionId, SessionConfig, SessionQuestion } from '../types';

export interface QuizState {
  config: SessionConfig;
  /** Judul sesi, mis. "Semua Soal" atau "Ulangi Soal yang Salah". */
  title: string;
  questions: SessionQuestion[];
  answers: (AnswerRecord | null)[];
  /** Tanda "ragu-ragu" per soal (Mode Ujian). */
  flags: boolean[];
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
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'goto'; index: number }
  | { type: 'toggleFlag' }
  | { type: 'finish' }
  | { type: 'expire' }
  | { type: 'exit' };

/** Mengakhiri sesi: soal yang belum dijawab dihitung tidak terjawab. */
function end(state: QuizState, expired: boolean): QuizState {
  const answers = state.answers.map((a) => a ?? { selectedOriginalId: null });
  return { ...state, answers, finished: true, expired };
}

export function quizReducer(state: QuizState | null, action: QuizAction): QuizState | null {
  if (action.type === 'start') {
    if (action.questions.length === 0) return state;
    return {
      config: action.config,
      title: action.title,
      questions: action.questions,
      answers: action.questions.map(() => null),
      flags: action.questions.map(() => false),
      index: 0,
      finished: false,
      deadline: action.config.timer > 0 ? action.now + action.config.timer * 60_000 : null,
      expired: false,
    };
  }
  if (action.type === 'exit') return null;
  if (!state || state.finished) return state;

  const exam = state.config.mode === 'exam';
  const current = state.answers[state.index];
  const last = state.questions.length - 1;

  switch (action.type) {
    case 'answer': {
      // Mode Latihan: jawaban pertama langsung dikunci. Mode Ujian: jawaban boleh diganti.
      if (current && !exam) return state;
      const answers = [...state.answers];
      answers[state.index] = { selectedOriginalId: action.originalId };
      return { ...state, answers };
    }
    case 'next': {
      if (exam) return state.index < last ? { ...state, index: state.index + 1 } : state;
      if (!current) return state; // Mode Latihan: belum dijawab, tidak boleh lanjut
      if (state.index >= last) return { ...state, finished: true };
      return { ...state, index: state.index + 1 };
    }
    case 'prev':
      return exam && state.index > 0 ? { ...state, index: state.index - 1 } : state;
    case 'goto':
      return exam && action.index >= 0 && action.index <= last ? { ...state, index: action.index } : state;
    case 'toggleFlag': {
      if (!exam) return state;
      const flags = [...state.flags];
      flags[state.index] = !flags[state.index];
      return { ...state, flags };
    }
    case 'finish':
      return exam ? end(state, false) : state;
    case 'expire':
      return end(state, true);
    default:
      return state;
  }
}

export function useQuizSession() {
  return useReducer(quizReducer, null);
}
