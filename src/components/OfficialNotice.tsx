export function OfficialNotice({ className = '' }: { className?: string }) {
  return (
    <p
      className={`inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-bold tracking-wide text-amber-900 ${className}`}
    >
      SOAL LATIHAN — BUKAN SOAL RESMI BKN
    </p>
  );
}

export function Footer() {
  return (
    <footer className="mt-10 border-t border-slate-200 bg-white px-4 py-5 text-center text-xs text-slate-600">
      <OfficialNotice />
      <p className="mt-2">
        Latihan SKD CPNS 2026 · Soal disusun untuk latihan mandiri dan tidak berasal dari ujian resmi.
      </p>
    </footer>
  );
}
