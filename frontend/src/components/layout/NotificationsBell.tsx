import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../../lib/notifications-api';
import type { AppNotification } from '../../lib/notifications-api';

// Campanita de avisos de la barra superior. Hoy la usa el perfil QA: cuando una tarjeta que
// reporto llega a Completado le llega un aviso para que valide la correccion.
export function NotificationsBell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });
  const unread = data?.unreadCount ?? 0;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  function handleClick(n: AppNotification) {
    if (!n.readAt) readMutation.mutate(n.id);
    setOpen(false);
    if (n.workItemId) navigate(`/tareas?tarea=${n.workItemId}`);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Avisos"
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <span className="text-lg leading-none">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">Avisos</span>
            {unread > 0 && (
              <button
                onClick={() => readAllMutation.mutate()}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                Marcar todos como leídos
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {(data?.data ?? []).length === 0 && (
              <li className="px-3 py-4 text-center text-xs text-slate-400">No tenés avisos.</li>
            )}
            {(data?.data ?? []).map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => handleClick(n)}
                  className={`block w-full px-3 py-2 text-left hover:bg-slate-50 ${
                    n.readAt ? '' : 'bg-brand-50/60'
                  }`}
                >
                  <p className={`text-sm ${n.readAt ? 'text-slate-500' : 'text-slate-800'}`}>
                    {n.text}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {new Date(n.createdAt).toLocaleString('es-AR')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
