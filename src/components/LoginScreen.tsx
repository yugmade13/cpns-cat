import { useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../auth/AuthContext';
import { AlertIcon } from './Icons';

export function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Isi username dan password.');
      return;
    }
    if (!login(username, password)) {
      setError('Username atau password salah.');
      setPassword('');
      passwordRef.current?.focus();
    }
  };

  const inputClass =
    'min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-[16px] text-slate-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30';

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-sm flex-col justify-center px-4 py-10">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink sm:text-3xl">Simulasi SKD CPNS 2027</h1>
        <p className="mt-2 text-[15px] text-slate-600">Masuk untuk mulai berlatih.</p>
      </header>

      <form className="card space-y-4 p-5 sm:p-6" onSubmit={submit} noValidate>
        <div>
          <label htmlFor="login-username" className="mb-1.5 block text-sm font-semibold text-brand-ink">
            Username
          </label>
          <input
            id="login-username"
            className={inputClass}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1.5 block text-sm font-semibold text-brand-ink">
            Password
          </label>
          <div className="relative">
            <input
              id="login-password"
              ref={passwordRef}
              className={`${inputClass} pr-24`}
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-1 my-1 rounded-md px-3 text-sm font-semibold text-brand-ink hover:bg-brand-50"
              onClick={() => setShow((v) => !v)}
              aria-pressed={show}
            >
              {show ? 'Sembunyikan' : 'Tampilkan'}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[15px] text-red-800 ring-1 ring-red-200">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full text-base">
          Masuk
        </button>
      </form>
    </div>
  );
}
