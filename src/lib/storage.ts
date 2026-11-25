// Pembungkus localStorage yang aman. Data latihan disimpan per pengguna (owner = username):
// daftar soal yang di-bookmark dan soal yang pernah salah.

export type StoredListKey = 'bookmarks' | 'wrong';

/** Kunci localStorage milik satu pengguna, mis. "skd-cpns:andi:bookmarks". */
export const storageKey = (owner: string, key: StoredListKey) => `skd-cpns:${owner}:${key}`;

/** localStorage bila bisa dipakai (tidak diblokir, tidak mode privat yang menolak tulis), selain itu null. */
export function getStorage(): Storage | null {
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

export function readIds(owner: string, key: StoredListKey): string[] {
  const s = getStorage();
  if (!s) return [];
  try {
    const parsed: unknown = JSON.parse(s.getItem(storageKey(owner, key)) ?? '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((x): x is string => typeof x === 'string'))] : [];
  } catch {
    return [];
  }
}

export function writeIds(owner: string, key: StoredListKey, ids: string[]): boolean {
  const s = getStorage();
  if (!s) return false;
  try {
    s.setItem(storageKey(owner, key), JSON.stringify([...new Set(ids)]));
    return true;
  } catch {
    return false;
  }
}

export function clearStored(owner: string): void {
  const s = getStorage();
  if (!s) return;
  try {
    s.removeItem(storageKey(owner, 'bookmarks'));
    s.removeItem(storageKey(owner, 'wrong'));
  } catch {
    /* abaikan */
  }
}
