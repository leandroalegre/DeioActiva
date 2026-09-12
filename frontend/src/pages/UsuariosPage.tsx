import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../lib/users-api';
import { UserFormModal } from '../components/users/UserFormModal';
import { useAuth } from '../app/auth/AuthContext';
import type { AppUser } from '../types/user';

const ADMIN_ROLES = ['super_admin', 'admin'];

export function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = Boolean(currentUser && ADMIN_ROLES.includes(currentUser.role.code));

  const { data: users, isLoading, isError } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
    enabled: isAdmin,
  });

  const [modalState, setModalState] = useState<
    { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; user: AppUser }
  >({ mode: 'closed' });

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">No tenés permiso para ver esta sección.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Usuarios</h1>
          <p className="text-sm text-slate-500">Altas, roles y estado de las cuentas del sistema.</p>
        </div>
        <button
          onClick={() => setModalState({ mode: 'create' })}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + Nuevo usuario
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando usuarios...</p>}
      {isError && (
        <p className="text-sm text-red-600">
          No se pudieron cargar los usuarios. Revisá que el backend esté corriendo.
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(users ?? []).map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">{u.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {u.role.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.active ? (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setModalState({ mode: 'edit', user: u })}
                      className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
              {(users ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400">
                    Todavía no hay usuarios además del tuyo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalState.mode === 'create' && (
        <UserFormModal onClose={() => setModalState({ mode: 'closed' })} />
      )}
      {modalState.mode === 'edit' && (
        <UserFormModal user={modalState.user} onClose={() => setModalState({ mode: 'closed' })} />
      )}
    </div>
  );
}
