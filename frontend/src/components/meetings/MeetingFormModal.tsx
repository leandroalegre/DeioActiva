import { FormEvent, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createMeeting,
  fetchMeetingOptions,
  fetchMeetings,
  updateMeeting,
} from '../../lib/meetings-api';
import type { MeetingPayload } from '../../lib/meetings-api';
import { getApiErrorMessage } from '../../lib/api-client';
import { MEETING_FREQUENCIES, MEETING_STATUSES, formatDay, todayKey } from '../../types/meeting';
import type { Meeting, MeetingFrequency, MeetingStatus } from '../../types/meeting';

const INPUT =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';
const LABEL = 'mb-1 block text-sm font-medium text-slate-700';

// Alta / edicion de una reunion. Replica los campos del modulo Reuniones de Gestion Activa
// (titulo, area convocante, fecha, horario, frecuencia, participantes, descripcion) y en el
// alta permite cargar el orden del dia (un punto por linea) y traer los puntos abiertos de
// una reunion anterior de la serie.
export function MeetingFormModal({
  meeting,
  onClose,
  onSaved,
}: {
  meeting?: Meeting;
  onClose: () => void;
  onSaved?: (meeting: Meeting) => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(meeting);

  const { data: options } = useQuery({ queryKey: ['meeting-options'], queryFn: fetchMeetingOptions });
  const { data: previousCandidates } = useQuery({
    queryKey: ['meetings', { when: 'all' }],
    queryFn: () => fetchMeetings({ when: 'all' }),
    enabled: !isEditing,
  });

  const [title, setTitle] = useState(meeting?.title ?? '');
  const [area, setArea] = useState(meeting?.area ?? '');
  const [date, setDate] = useState(meeting?.date?.slice(0, 10) ?? todayKey());
  const [startTime, setStartTime] = useState(meeting?.startTime ?? '');
  const [endTime, setEndTime] = useState(meeting?.endTime ?? '');
  const [location, setLocation] = useState(meeting?.location ?? '');
  const [frequency, setFrequency] = useState<MeetingFrequency>(meeting?.frequency ?? 'UNIQUE');
  const [status, setStatus] = useState<MeetingStatus>(meeting?.status ?? 'SCHEDULED');
  const [description, setDescription] = useState(meeting?.description ?? '');
  const [userIds, setUserIds] = useState<string[]>(
    meeting?.participants.filter((p) => p.userId).map((p) => p.userId!) ?? [],
  );
  const [externals, setExternals] = useState(
    meeting?.participants
      .filter((p) => !p.userId)
      .map((p) => p.name)
      .join(', ') ?? '',
  );
  const [userFilter, setUserFilter] = useState('');
  const [agenda, setAgenda] = useState('');
  const [previousMeetingId, setPreviousMeetingId] = useState('');
  const [carryOver, setCarryOver] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const q = userFilter.trim().toLowerCase();
    // Los desarrolladores no se ofrecen como participantes (a pedido). Si una reunion vieja
    // ya tenia uno cargado, se sigue mostrando para poder quitarlo.
    return (options?.users ?? []).filter(
      (u) =>
        (u.role?.code !== 'developer' || userIds.includes(u.id)) &&
        (!q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)),
    );
  // userIds a proposito fuera de las dependencias: si se destilda un desarrollador que ya
  // estaba cargado, sigue visible hasta cerrar el modal.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, userFilter]);

  const mutation = useMutation({
    mutationFn: () => {
      const participants = [
        ...userIds.map((userId) => ({ userId })),
        ...externals
          .split(',')
          .map((n) => n.trim())
          .filter(Boolean)
          .map((name) => ({ name })),
      ];
      const base: MeetingPayload = {
        title: title.trim(),
        area: area.trim() || null,
        description: description.trim() || null,
        location: location.trim() || null,
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        frequency,
        status,
        participants,
      };
      if (isEditing) return updateMeeting(meeting!.id, base);
      return createMeeting({
        ...base,
        points: agenda
          .split('\n')
          .map((l) => l.replace(/^\s*(\d+[.)-]|[-*•])\s*/, '').trim())
          .filter(Boolean)
          .map((t) => ({ title: t })),
        previousMeetingId: previousMeetingId || undefined,
        carryOverPending: previousMeetingId ? carryOver : undefined,
      });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting', saved.id] });
      queryClient.invalidateQueries({ queryKey: ['meeting-pending-points'] });
      onSaved?.(saved);
      onClose();
    },
    onError: (err) =>
      setError(getApiErrorMessage(err, 'No se pudo guardar la reunión. Revisá los datos.')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !date) {
      setError('Título y fecha son obligatorios.');
      return;
    }
    if (startTime && endTime && endTime <= startTime) {
      setError('La hora de fin debe ser posterior a la de inicio.');
      return;
    }
    mutation.mutate();
  }

  function toggleUser(id: string) {
    setUserIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <h2 className="border-b border-slate-100 px-6 py-4 text-lg font-semibold text-slate-800">
          {isEditing ? 'Editar reunión' : 'Nueva reunión'}
        </h2>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="grid flex-1 grid-cols-1 gap-3 overflow-y-auto px-6 py-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={LABEL}>Título</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Seguimiento semanal DEO"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Área convocante</label>
              <input value={area} onChange={(e) => setArea(e.target.value)} className={INPUT} />
            </div>
            <div>
              <label className={LABEL}>Lugar / link</label>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Sala, Meet, Zoom..."
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Fecha</label>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={INPUT}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={LABEL}>Inicio</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Fin</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className={INPUT}
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Frecuencia</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as MeetingFrequency)}
                className={INPUT}
              >
                {MEETING_FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MeetingStatus)}
                className={INPUT}
              >
                {MEETING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL}>
                Participantes del sistema{' '}
                <span className="font-normal text-slate-400">({userIds.length} seleccionados)</span>
              </label>
              <input
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                placeholder="Buscar usuario..."
                className={`${INPUT} mb-2`}
              />
              <div className="grid max-h-36 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-slate-200 p-2 sm:grid-cols-2">
                {filteredUsers.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={userIds.includes(u.id)}
                      onChange={() => toggleUser(u.id)}
                      className="rounded border-slate-300 text-brand-500"
                    />
                    <span className="truncate" title={u.email}>
                      {u.fullName}
                    </span>
                  </label>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="px-2 py-1 text-xs text-slate-400">Sin resultados.</p>
                )}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>
                Participantes externos{' '}
                <span className="font-normal text-slate-400">(separados por coma)</span>
              </label>
              <input
                value={externals}
                onChange={(e) => setExternals(e.target.value)}
                placeholder="Ej: Juan Pérez (Proveedor), María Gómez"
                className={INPUT}
              />
            </div>

            <div className="sm:col-span-2">
              <label className={LABEL}>Descripción / objetivo (opcional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className={INPUT}
              />
            </div>

            {!isEditing && (
              <>
                <div className="sm:col-span-2">
                  <label className={LABEL}>
                    Orden del día{' '}
                    <span className="font-normal text-slate-400">
                      (un punto por línea, opcional — se pueden agregar después)
                    </span>
                  </label>
                  <textarea
                    value={agenda}
                    onChange={(e) => setAgenda(e.target.value)}
                    rows={4}
                    placeholder={'1. Estado del módulo Legajos\n2. Definir fecha de UAT\n3. Varios'}
                    className={INPUT}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={LABEL}>Reunión anterior de la serie (opcional)</label>
                  <select
                    value={previousMeetingId}
                    onChange={(e) => setPreviousMeetingId(e.target.value)}
                    className={INPUT}
                  >
                    <option value="">— Ninguna —</option>
                    {(previousCandidates ?? []).map((m) => (
                      <option key={m.id} value={m.id}>
                        {formatDay(m.date)} · {m.title}
                        {m.pointsSummary.open > 0 ? ` (${m.pointsSummary.open} abiertos)` : ''}
                      </option>
                    ))}
                  </select>
                  {previousMeetingId && (
                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                      <input
                        type="checkbox"
                        checked={carryOver}
                        onChange={(e) => setCarryOver(e.target.checked)}
                        className="rounded border-slate-300 text-brand-500"
                      />
                      Traer los puntos pendientes de esa reunión al orden del día
                    </label>
                  )}
                </div>
              </>
            )}
          </div>

          {error && <p className="px-6 text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
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
              {mutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear reunión'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
