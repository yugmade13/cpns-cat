// Logika login sederhana berbasis daftar pengguna (tanpa server).
import type { AppUser } from '../config/users';
import { getStorage } from './storage';

/** Kunci localStorage untuk sesi login (berisi username yang sedang masuk). */
export const SESSION_KEY = 'skd-cpns:session';

export const normalizeUsername = (u: string) => u.trim().toLowerCase();

/** Mencari pengguna yang cocok. Username tidak membedakan huruf besar/kecil; password harus sama persis. */
export function findUser(users: readonly AppUser[], username: string, password: string): AppUser | null {
  const u = normalizeUsername(username);
  if (!u || password === '') return null;
  return users.find((x) => normalizeUsername(x.username) === u && x.password === password) ?? null;
}

/** Pengguna untuk sesi tersimpan; null jika tidak ada sesi atau username sudah tidak terdaftar. */
export function userForSession(users: readonly AppUser[], sessionUsername: string | null): AppUser | null {
  if (!sessionUsername) return null;
  const u = normalizeUsername(sessionUsername);
  return users.find((x) => normalizeUsername(x.username) === u) ?? null;
}

/** Username yang mencurigakan (duplikat / kosong / berspasi) — dicek oleh unit test agar daftar pengguna rapi. */
export function userListProblems(users: readonly AppUser[]): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const x of users) {
    const u = normalizeUsername(x.username);
    if (!u) problems.push('Ada username kosong.');
    else if (/\s/.test(u)) problems.push(`Username "${x.username}" mengandung spasi.`);
    if (seen.has(u)) problems.push(`Username "${x.username}" dipakai lebih dari sekali.`);
    seen.add(u);
    if (!x.password) problems.push(`Pengguna "${x.username}" tidak punya password.`);
  }
  return problems;
}

export function readSession(): string | null {
  try {
    return getStorage()?.getItem(SESSION_KEY) ?? null;
  } catch {
    return null;
  }
}

export function writeSession(username: string): void {
  try {
    getStorage()?.setItem(SESSION_KEY, username);
  } catch {
    /* tanpa localStorage, sesi hanya bertahan sampai halaman dimuat ulang */
  }
}

export function clearSession(): void {
  try {
    getStorage()?.removeItem(SESSION_KEY);
  } catch {
    /* abaikan */
  }
}
