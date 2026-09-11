import { useAuth } from '../../app/auth/AuthContext';

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-end gap-4 border-b border-slate-200 bg-white px-6">
      <div className="text-right">
        <p className="text-sm font-medium text-slate-800">{user?.fullName}</p>
        <p className="text-xs text-slate-500">{user?.role.name}</p>
      </div>
      <button
        onClick={() => logout()}
        className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
      >
        Salir
      </button>
    </header>
  );
}
