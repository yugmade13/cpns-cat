// Penyimpanan bank soal unggahan di IndexedDB (hanya di browser pengguna), satu database per pengguna.
// Semua fungsi aman dipanggil walau IndexedDB tidak tersedia.
import type { BankFile } from './bankFiles';

/** Nama database milik satu pengguna, mis. "skd-cpns-bank:andi". */
const dbName = (owner: string) => `skd-cpns-bank:${owner}`;
const STORE = 'files';
const VERSION = 1;

const dbPromises = new Map<string, Promise<IDBDatabase>>();

function openDb(owner: string): Promise<IDBDatabase> {
  const cached = dbPromises.get(owner);
  if (cached) return cached;
  const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('IndexedDB tidak tersedia');
      const req = indexedDB.open(dbName(owner), VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'name' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error('Gagal membuka IndexedDB'));
      req.onblocked = () => reject(new Error('IndexedDB diblokir'));
    } catch (e) {
      reject(e instanceof Error ? e : new Error(String(e)));
    }
  });
  dbPromises.set(owner, dbPromise);
  dbPromise.catch(() => dbPromises.delete(owner));
  return dbPromise;
}

function run<T>(
  owner: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDb(owner).then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => resolve(req ? req.result : undefined);
        tx.onerror = () => reject(tx.error ?? new Error('Transaksi IndexedDB gagal'));
        tx.onabort = () => reject(tx.error ?? new Error('Transaksi IndexedDB dibatalkan'));
      }),
  );
}

/** Memuat semua file tersimpan. `available: false` berarti penyimpanan tidak bisa dipakai. */
export async function loadStoredFiles(owner: string): Promise<{ available: boolean; files: unknown[] }> {
  try {
    const files = await run<unknown[]>(owner, 'readonly', (s) => s.getAll());
    return { available: true, files: files ?? [] };
  } catch {
    return { available: false, files: [] };
  }
}

export async function saveFiles(owner: string, files: BankFile[]): Promise<void> {
  await run(owner, 'readwrite', (s) => {
    for (const f of files) s.put(f);
  });
}

export async function deleteStoredFile(owner: string, name: string): Promise<void> {
  await run(owner, 'readwrite', (s) => s.delete(name));
}
