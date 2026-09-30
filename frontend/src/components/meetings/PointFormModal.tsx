import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPoint, updatePoint } from '../../lib/meetings-api';
import { getApiErrorMessage } from '../../lib/api-client';
import { POINT_STATUSES, POINT_TYPES } from '../../types/meeting';
import type {
  MeetingPoint,
  MeetingPointStatus,
  MeetingPointType,
  UserRef,
} from '../../types/meeting';

const INPUT =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
const LABEL = 'mb-1 block text-sm font-medium text-slate-700';

// Alta / edicion de un punto del orden del dia: tema a tratar, tipo, responsable, fecha de
// control y la resolucion alcanzada.
export function PointFormModal({
  meetingId,
  point,
  users,
  onClose,
}: {
  meetingId: string;
  point?: MeetingPoint;
  users: UserRef[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(point);

  const [title, setTitle] = useState(point?.title ?? '');
  const [description, setDescription] = useState(point?.description ?? '');
  const [type, setType] = useState<MeetingPointType>(point?.type ?? 'TOPIC');
  const [status, setStatus] = useState<MeetingPointStatus>(point?.status ?? 'PENDING');
  const [responsibleId, setResponsibleId] = useState(point?.responsibleId ?? '');
  const [dueDate, setDueDate] = useState(point?.dueDate?.slice(0, 10) ?? '');
  const [resolution, setResolution] = useState(point?.resolution ?? '');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      // null (y no undefined) al vaciar un campo, para que el PATCH realmente lo limpie.
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        type,
        status,
        responsibleId: responsibleId || null,
        dueDate: dueDate || null,
        resolution: resolution.trim() || null,
      };
      return isEditing ? updatePoint(point!.id, payload) : createPoint(meetingId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-pending-points'] });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo guardar el punto.')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('El punto necesita un título.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          {isEditing ? 'Editar punto' : 'Nuevo punto a tratar'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className={LABEL}>Punto / tema</label>
            <input
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={INPUT}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MeetingPointType)}
                className={INPUT}
              >
                {POINT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MeetingPointStatus)}
                className={INPUT}
              >
                {POINT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Responsable</label>
              <select
                value={responsibleId}
                onChange={(e) => setResponsibleId(e.target.value)}
                className={INPUT}
              >
                <option value="">— Sin asignar —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Fecha de control</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={INPUT}
              />
            </div>
          </div>
          <div>
            <label className={LABEL}>Detalle (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Resolución / acuerdo</label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
              placeholder="Qué se resolvió sobre este punto"
              className={INPUT}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {mutation.isPending ? 'Guardando...' : isEditing ? 'Guardar' : 'Agregar punto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
