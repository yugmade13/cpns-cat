// Pembungkus localStorage yang aman. Hanya menyimpan dua daftar ID:
// soal yang di-bookmark dan soal yang pernah salah.
const STORAGE_KEYS = {
  bookmarks: 'skd-cpns:bookmarks',
  wrong: 'skd-cpns:wrong',
} as const;

export type StoredListKey = keyof typeof STORAGE_KEYS;

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__skd_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}

export function isStorageAvailable(): boolean {
  return getStorage() !== null;
}

export function readIds(key: StoredListKey): string[] {
  const s = getStorage();
  if (!s) return [];
  try {
    const parsed: unknown = JSON.parse(s.getItem(STORAGE_KEYS[key]) ?? '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((x): x is string => typeof x === 'string'))] : [];
  } catch {
    return [];
  }
}

export function writeIds(key: StoredListKey, ids: string[]): boolean {
  const s = getStorage();
  if (!s) return false;
  try {
    s.setItem(STORAGE_KEYS[key], JSON.stringify([...new Set(ids)]));
    return true;
  } catch {
    return false;
  }
}

export function clearStored(): void {
  const s = getStorage();
  if (!s) return;
  try {
    s.removeItem(STORAGE_KEYS.bookmarks);
    s.removeItem(STORAGE_KEYS.wrong);
  } catch {
    /* abaikan */
  }
}
