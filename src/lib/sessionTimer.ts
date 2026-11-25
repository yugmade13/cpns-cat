import { TIMER_OPTIONS, type TimerSetting } from '../types';

/** Saran waktu latihan: ±1 menit per soal, dibulatkan ke pilihan terdekat di atasnya (maksimal 60 menit). */
export function suggestedTimer(questionCount: number): TimerSetting {
  return TIMER_OPTIONS.find((t) => t > 0 && t >= questionCount) ?? 60;
}
