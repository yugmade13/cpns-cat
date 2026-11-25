import { useEffect, useRef, useState } from 'react';

/**
 * Hitung mundur per soal. `resetKey` berubah → timer diulang dari awal.
 * Berhenti saat `running` false. `onExpire` dipanggil sekali saat waktu habis.
 */
export function useTimer(seconds: number, resetKey: string | number, running: boolean, onExpire: () => void): number {
  const [state, setState] = useState({ key: resetKey, remaining: seconds });
  const deadline = useRef<{ key: string | number; at: number } | null>(null);
  const expireRef = useRef(onExpire);
  expireRef.current = onExpire;

  // Soal baru: langsung tampilkan waktu penuh pada render yang sama (tanpa sisa nilai soal sebelumnya).
  if (state.key !== resetKey) setState({ key: resetKey, remaining: seconds });

  useEffect(() => {
    if (!running || seconds <= 0) return;
    if (!deadline.current || deadline.current.key !== resetKey) {
      deadline.current = { key: resetKey, at: Date.now() + seconds * 1000 };
    }
    const at = deadline.current.at;
    let fired = false;
    const tick = () => {
      const left = Math.max(0, Math.ceil((at - Date.now()) / 1000));
      setState({ key: resetKey, remaining: left });
      if (left === 0 && !fired) {
        fired = true;
        expireRef.current();
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [running, seconds, resetKey]);

  return state.key === resetKey ? state.remaining : seconds;
}
