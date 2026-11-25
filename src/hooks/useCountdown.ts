import { useEffect, useRef, useState } from 'react';

const secondsLeft = (deadline: number) => Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

/**
 * Hitung mundur menuju `deadline` (epoch ms). Mengembalikan sisa detik, atau null jika tanpa timer.
 * `onExpire` dipanggil sekali saat waktu habis.
 */
export function useCountdown(deadline: number | null, onExpire: () => void): number | null {
  const [remaining, setRemaining] = useState(() => (deadline === null ? null : secondsLeft(deadline)));
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  useEffect(() => {
    if (deadline === null) {
      setRemaining(null);
      return;
    }
    let fired = false;
    const tick = () => {
      const left = secondsLeft(deadline);
      setRemaining(left);
      if (left === 0 && !fired) {
        fired = true;
        expireRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [deadline]);

  return deadline === null ? null : (remaining ?? secondsLeft(deadline));
}

/** Format detik menjadi "mm:ss" (atau "j:mm:ss" bila ≥ 1 jam). */
export function formatClock(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
