import { useCallback, useState } from 'react';
import { clearStored, isStorageAvailable, readIds, writeIds, type StoredListKey } from '../lib/storage';

/** Daftar ID bookmark & soal yang pernah salah, disinkronkan ke localStorage bila tersedia. */
export function useStoredIds() {
  const [available] = useState(isStorageAvailable);
  const [bookmarks, setBookmarks] = useState<string[]>(() => readIds('bookmarks'));
  const [wrong, setWrong] = useState<string[]>(() => readIds('wrong'));

  const update = useCallback(
    (key: StoredListKey, fn: (prev: string[]) => string[]) => {
      if (!available) return;
      const setter = key === 'bookmarks' ? setBookmarks : setWrong;
      setter((prev) => {
        const next = fn(prev);
        writeIds(key, next);
        return next;
      });
    },
    [available],
  );

  const toggleBookmark = useCallback(
    (id: string) => update('bookmarks', (p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id])),
    [update],
  );
  const markWrong = useCallback((id: string) => update('wrong', (p) => (p.includes(id) ? p : [...p, id])), [update]);
  const markRight = useCallback((id: string) => update('wrong', (p) => p.filter((x) => x !== id)), [update]);
  const clearAll = useCallback(() => {
    clearStored();
    setBookmarks([]);
    setWrong([]);
  }, []);

  return { available, bookmarks, wrong, toggleBookmark, markWrong, markRight, clearAll };
}

export type StoredIds = ReturnType<typeof useStoredIds>;
