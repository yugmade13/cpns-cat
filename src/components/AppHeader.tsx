import type { AppUser } from '../config/users';
import { LogoutIcon } from './Icons';

/** Inisial untuk avatar, mis. "Demo 1" → "D1", "Andi Saputra" → "AS". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

interface Props {
  user: AppUser;
  onLogout: () => void;
}

export function AppHeader({ user, onLogout }: Props) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-3 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand text-base font-extrabold text-white"
            aria-hidden="true"
          >
            S
          </span>
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate text-sm font-bold text-brand-ink">Simulasi SKD CPNS</span>
            <span className="block text-xs text-slate-500">2027</span>
          </span>
        </div>

        <div className="ml-auto flex min-w-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-ink ring-1 ring-brand/30"
            aria-hidden="true"
          >
            {initials(user.name)}
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] text-slate-500">Masuk sebagai</span>
            <span className="block max-w-[9rem] truncate text-sm font-semibold text-brand-ink sm:max-w-[14rem]">{user.name}</span>
          </span>
          <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-700"
          >
            <LogoutIcon className="h-4 w-4" />
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}
