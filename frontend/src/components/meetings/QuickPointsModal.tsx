import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPoint } from '../../lib/meetings-api';
import { getApiErrorMessage } from '../../lib/api-client';
import { parsearCargaRapida } from '../../lib/carga-rapida';
import { DictadoBoton, sumarDictado } from '../ui/DictadoBoton';
import { POINT_TYPES, formatDay } from '../../types/meeting';
import type { MeetingPointType, UserRef } from '../../types/meeting';

// Carga rapida de puntos: uno por linea, "@nombre" para el responsable y "!fecha" para la
// fecha de control. Se puede dictar con el microfono (cada frase es una linea nueva).
export function QuickPointsModal({
  meetingId,
  users,
  onClose,
  onDone,
}: {
  meetingId: string;
  users: UserRef[];
  onClose: () => void;
  onDone: (created: number) => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [type, setType] = useState<MeetingPointType>('ACTION');
  const [error, setError] = useState<string | null>(null);

  const people = useMemo(
    () => users.map((u) => ({ id: u.id, nombreCompleto: u.fullName, email: u.email })),
    [users],
  );
  const lines = useMemo(() => parsearCargaRapida(text, people), [text, people]);

  const mutation = useMutation({
    mutationFn: async () => {
      // De a uno y en orden, para que queden numerados como se escribieron.
      for (const l of lines) {
        const extra = [
          ...l.responsables.slice(1).map((r) => r.nombreCompleto),
          ...l.sinUsuario,
        ];
        await createPoint(meetingId, {
          title: l.titulo,
          type,
          responsibleId: l.responsables[0]?.id ?? null,
          dueDate: l.vence,
          description: extra.length ? `También: ${extra.join(', ')}` : null,
        });
      }
      return lines.length;
    },
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-pending-points'] });
      onDone(n);
    },
    onError: (err) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      setError(getApiErrorMessage(err, 'No se pudieron cargar todos los puntos.'));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 sm:items-center sm:p-4">
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6">
        <h2 className="text-lg font-semibold text-slate-800">Carga rápida de puntos</h2>
        <p className="mb-3 mt-1 text-xs text-slate-500">
          Un punto por línea. <b>@nombre</b> asigna el responsable y <b>!20/11</b> la fecha de
          control. Ej.: <i>Revisar presupuesto @Juan !20/11</i>
        </p>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="text-sm font-medium text-slate-700">Tipo:</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as MeetingPointType)}
            className="rounded-lg border border-slate-300 px-2 py-1 text-sm"
          >
            {POINT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <span className="ml-auto" />
          <DictadoBoton etiqueta="Dictar" onTexto={(t) => setText((v) => sumarDictado(v, t, '\n'))} />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          autoFocus
          placeholder={'Revisar presupuesto @Juan !20/11\nLlamar al proveedor @Ana'}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />

        {lines.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-2">Punto</th>
                  <th className="p-2">Responsable</th>
                  <th className="p-2">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td className="p-2">
                      {l.titulo}
                      {l.avisos.length > 0 && (
                        <p className="text-xs text-amber-600">{l.avisos.join(' · ')}</p>
                      )}
                    </td>
                    <td className="p-2 text-slate-600">
                      {[...l.responsables.map((r) => r.nombreCompleto), ...l.sinUsuario].join(', ') ||
                        '—'}
                    </td>
                    <td className="p-2 text-slate-600">{l.vence ? formatDay(l.vence) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={lines.length === 0 || mutation.isPending}
            className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {mutation.isPending
              ? 'Cargando...'
              : `Agregar ${lines.length || ''} punto${lines.length === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </div>
  );
}
