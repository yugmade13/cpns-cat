import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { USERS, type AppUser } from '../config/users';
import { clearSession, findUser, normalizeUsername, readSession, userForSession, writeSession } from '../lib/auth';

interface AuthValue {
  /** Pengguna yang sedang masuk, atau null. */
  user: AppUser | null;
  /** Kunci pemilik data di browser (username huruf kecil). */
  owner: string | null;
  /** Mengembalikan true jika berhasil masuk. */
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children, users = USERS }: { children: ReactNode; users?: readonly AppUser[] }) {
  // Sesi tersimpan dicek ulang ke daftar: pengguna yang sudah dihapus dari daftar otomatis keluar.
  const [user, setUser] = useState<AppUser | null>(() => {
    const u = userForSession(users, readSession());
    if (!u) clearSession();
    return u;
  });

  const login = useCallback(
    (username: string, password: string) => {
      const found = findUser(users, username, password);
      if (!found) return false;
      writeSession(normalizeUsername(found.username));
      setUser(found);
      return true;
    },
    [users],
  );

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, owner: user ? normalizeUsername(user.username) : null, login, logout }),
    [user, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>.');
  return ctx;
}
