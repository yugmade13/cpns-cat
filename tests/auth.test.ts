import { describe, expect, it } from 'vitest';
import { USERS, type AppUser } from '../src/config/users';
import { findUser, normalizeUsername, readSession, userForSession, userListProblems } from '../src/lib/auth';
import { storageKey } from '../src/lib/storage';

const users: AppUser[] = [
  { username: 'andi', password: 'Rahasia-1', name: 'Andi' },
  { username: 'Budi', password: 'rahasia-2', name: 'Budi' },
];

describe('login berdasarkan daftar pengguna', () => {
  it('berhasil hanya jika username & password cocok', () => {
    expect(findUser(users, 'andi', 'Rahasia-1')?.name).toBe('Andi');
    expect(findUser(users, 'andi', 'rahasia-1')).toBeNull(); // password peka huruf besar/kecil
    expect(findUser(users, 'andi', 'salah')).toBeNull();
    expect(findUser(users, 'citra', 'Rahasia-1')).toBeNull(); // tidak terdaftar
  });

  it('username tidak peka huruf besar/kecil dan spasi di tepi diabaikan', () => {
    expect(findUser(users, '  ANDI ', 'Rahasia-1')?.name).toBe('Andi');
    expect(findUser(users, 'budi', 'rahasia-2')?.name).toBe('Budi');
    expect(normalizeUsername(' Budi ')).toBe('budi');
  });

  it('input kosong selalu gagal', () => {
    expect(findUser(users, '', 'Rahasia-1')).toBeNull();
    expect(findUser(users, 'andi', '')).toBeNull();
    expect(findUser([{ username: 'x', password: '', name: 'X' }], 'x', '')).toBeNull();
  });

  it('sesi tersimpan hanya berlaku bila username masih terdaftar', () => {
    expect(userForSession(users, 'budi')?.name).toBe('Budi');
    expect(userForSession(users, 'dihapus')).toBeNull();
    expect(userForSession(users, null)).toBeNull();
  });

  it('tanpa localStorage, membaca sesi aman (null)', () => {
    expect(readSession()).toBeNull();
  });

  it('data tiap pengguna memakai kunci penyimpanan sendiri', () => {
    expect(storageKey('andi', 'bookmarks')).not.toBe(storageKey('budi', 'bookmarks'));
    expect(storageKey('andi', 'wrong')).toBe('skd-cpns:andi:wrong');
  });

  it('mendeteksi masalah daftar pengguna', () => {
    expect(
      userListProblems([
        { username: 'a', password: 'x', name: 'A' },
        { username: 'A', password: 'y', name: 'A2' },
        { username: 'b c', password: 'z', name: 'BC' },
        { username: 'd', password: '', name: 'D' },
      ]),
    ).toEqual(['Username "A" dipakai lebih dari sekali.', 'Username "b c" mengandung spasi.', 'Pengguna "d" tidak punya password.']);
  });

  it('daftar pengguna di src/config/users.ts rapi (tidak ganda, tidak kosong, punya password)', () => {
    expect(USERS.length).toBeGreaterThan(0);
    expect(userListProblems(USERS)).toEqual([]);
  });
});
