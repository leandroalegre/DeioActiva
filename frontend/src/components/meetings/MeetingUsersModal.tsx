import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createMeetingUser, fetchMeetingUsers } from '../../lib/meetings-api';
import { getApiErrorMessage } from '../../lib/api-client';

const INPUT =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
const LABEL = 'mb-1 block text-sm font-medium text-slate-700';

// Usuarios del perfil Reuniones: listado y alta. Los usuarios que se crean aca siempre
// tienen rol Reuniones (lo fija el backend); no se puede elegir otro perfil.
export function MeetingUsersModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useQuery({
    queryKey: ['meeting-users'],
    queryFn: fetchMeetingUsers,
  });

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => createMeetingUser({ fullName: fullName.trim(), email: email.trim(), password }),
    onSuccess: (u) => {
      setCreated(u.fullName);
      setFullName('');
      setEmail('');
      setPassword('');
      queryClient.invalidateQueries({ queryKey: ['meeting-users'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-options'] });
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo crear el usuario.')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    if (!fullName.trim() || !email.trim()) {
      setError('Nombre y email son obligatorios.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Usuarios de Reuniones</h2>
          <p className="text-xs text-slate-500">
            Los usuarios que se crean acá tienen el perfil Reuniones: solo acceden a esta sección.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <ul className="mb-5 space-y-1.5">
            {isLoading && <li className="text-sm text-slate-500">Cargando...</li>}
            {(users ?? []).map((u) => (
              <li
                key={u.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{u.fullName}</span>
                  <span className="block truncate text-xs text-slate-500">{u.email}</span>
                </span>
                {!u.active && (
                  <span className="shrink-0 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    Inactivo
                  </span>
                )}
              </li>
            ))}
            {!isLoading && (users ?? []).length === 0 && (
              <li className="text-sm text-slate-400">Todavía no hay usuarios con perfil Reuniones.</li>
            )}
          </ul>

          <form onSubmit={handleSubmit} className="space-y-3 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-800">Nuevo usuario</h3>
            <div>
              <label htmlFor="mu-name" className={LABEL}>
                Nombre y apellido
              </label>
              <input id="mu-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label htmlFor="mu-email" className={LABEL}>
                Email
              </label>
              <input
                id="mu-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label htmlFor="mu-pass" className={LABEL}>
                Contraseña inicial <span className="font-normal text-slate-400">(mínimo 8 caracteres)</span>
              </label>
              <input
                id="mu-pass"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT}
              />
            </div>
            <p className="text-xs text-slate-500">Perfil: <span className="font-semibold">Reuniones</span></p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {created && <p className="text-sm text-green-700">Usuario “{created}” creado.</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {mutation.isPending ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
