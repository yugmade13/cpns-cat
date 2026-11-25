// Model data inti aplikasi Simulasi SKD CPNS.

export type Category = 'TWK' | 'TIU' | 'TKP';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type OptionId = 'A' | 'B' | 'C' | 'D' | 'E';
export type TiuSubtype = 'verbal' | 'numerik' | 'logika';

export const CATEGORIES: readonly Category[] = ['TWK', 'TIU', 'TKP'];
export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];
export const OPTION_IDS: readonly OptionId[] = ['A', 'B', 'C', 'D', 'E'];

export interface ChoiceOption {
  id: OptionId;
  text: string;
}

export interface TkpOption extends ChoiceOption {
  /** Skor 1–5. Kelima opsi wajib punya skor yang berbeda. */
  score: number;
  explanation: string;
}

interface BaseQuestion {
  id: string;
  topic: string;
  difficulty: Difficulty;
  question: string;
  tags: string[];
  /** false jika teks soal/opsi merujuk ke opsi lain (mis. "A dan B benar"). */
  shuffleOptions: boolean;
  /** Field tak dikenal dari JSON sumber, disimpan agar tidak hilang saat ekspor. */
  extra?: Record<string, unknown>;
}

/** Soal TWK atau TIU: satu jawaban benar. */
export interface ChoiceQuestion extends BaseQuestion {
  category: 'TWK' | 'TIU';
  options: ChoiceOption[];
  correctAnswer: OptionId;
  explanation: string;
  /** Alasan opsi lain kurang tepat, dikunci per id opsi asli. */
  optionNotes: Partial<Record<OptionId, string>>;
  solutionSteps: string[];
  shortcut: string;
  timeTip: string;
  /** Dasar konstitusional/historis (terutama TWK). */
  reference?: string;
  /** Subjenis TIU: verbal, numerik, atau logika. */
  subtype?: TiuSubtype;
}

/** Soal TKP: setiap opsi punya skor 1–5, tidak ada benar/salah. */
export interface TkpQuestion extends BaseQuestion {
  category: 'TKP';
  context: string;
  options: TkpOption[];
  competency: string;
  principle: string;
  whyBest: string;
  lesson: string;
}

export type Question = ChoiceQuestion | TkpQuestion;

// ---------- Sesi latihan ----------

export type CategoryFilter = Category | 'MIX';
/** Waktu total satu sesi latihan dalam menit (0 = tanpa batas waktu). */
export type TimerSetting = 0 | 10 | 15 | 20 | 30 | 45 | 60;
export const TIMER_OPTIONS: readonly TimerSetting[] = [0, 10, 15, 20, 30, 45, 60];
/**
 * practice: tiap soal langsung dikunci dan pembahasan muncul.
 * exam: seperti CAT — jawaban bisa diganti, bebas pindah nomor, pembahasan & skor di akhir.
 */
export type SessionMode = 'practice' | 'exam';

export interface SessionConfig {
  /** Waktu total sesi dalam menit (0 = tanpa batas). */
  timer: TimerSetting;
  mode: SessionMode;
}

/** Opsi setelah diacak: label tampilan baru, id asli tetap disimpan. */
export interface SessionOption {
  label: OptionId;
  originalId: OptionId;
  text: string;
  /** Hanya untuk TKP. */
  score?: number;
  explanation?: string;
}

export interface SessionQuestion {
  question: Question;
  options: SessionOption[];
}

export interface AnswerRecord {
  /** id opsi ASLI yang dipilih; null jika tidak terjawab (waktu habis). */
  selectedOriginalId: OptionId | null;
}

export type AnswerStatus = 'correct' | 'wrong' | 'unanswered' | 'scored';

export interface AnswerEvaluation {
  status: AnswerStatus;
  points: number;
  maxPoints: number;
  /** true jika soal perlu diulang: salah/tidak terjawab, atau skor TKP < 4. */
  needsReview: boolean;
}

export interface ChoiceCategorySummary {
  kind: 'choice';
  category: 'TWK' | 'TIU';
  total: number;
  correct: number;
  wrong: number;
  unanswered: number;
  score: number;
  maxScore: number;
  percent: number;
}

export interface TkpCategorySummary {
  kind: 'tkp';
  category: 'TKP';
  total: number;
  answered: number;
  unanswered: number;
  score: number;
  maxScore: number;
  average: number;
}

export type CategorySummary = ChoiceCategorySummary | TkpCategorySummary;

export interface WeakTopic {
  category: Category;
  topic: string;
  missed: number;
  total: number;
}

export interface SessionSummary {
  categories: CategorySummary[];
  weakTopics: WeakTopic[];
  reviewIds: string[];
  totalScore: number;
  maxScore: number;
}
