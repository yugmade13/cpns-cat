// Penyimpanan bank soal unggahan di IndexedDB (hanya di browser pengguna).
// Semua fungsi aman dipanggil walau IndexedDB tidak tersedia.
import type { BankFile } from './bankFiles';

const DB_NAME = 'skd-cpns-bank';
const STORE = 'files';
const VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      if (typeof indexedDB === 'undefined') throw new Error('IndexedDB tidak tersedia');
      const req = indexedDB.open(DB_NAME, VERSION);
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
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
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
export async function loadStoredFiles(): Promise<{ available: boolean; files: unknown[] }> {
  try {
    const files = await run<unknown[]>('readonly', (s) => s.getAll());
    return { available: true, files: files ?? [] };
  } catch {
    return { available: false, files: [] };
  }
}

export async function saveFiles(files: BankFile[]): Promise<void> {
  await run('readwrite', (s) => {
    for (const f of files) s.put(f);
  });
}

export async function deleteStoredFile(name: string): Promise<void> {
  await run('readwrite', (s) => s.delete(name));
}
