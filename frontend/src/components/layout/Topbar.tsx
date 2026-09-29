import { useAuth } from '../../app/auth/AuthContext';

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:justify-end sm:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label="Abrir menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div className="text-right">
        <p className="text-sm font-medium text-slate-800">{user?.fullName}</p>
        <p className="text-xs text-slate-500">{user?.role.name}</p>
      </div>
      <button
        onClick={() => logout()}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        Salir
      </button>
    </header>
  );
}
