import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  carryOverPoints,
  deleteMeeting,
  fetchMeeting,
  fetchMeetingOptions,
  fetchMeetings,
  finishMeeting,
  reorderPoints,
  updateAttendance,
  updateMeeting,
} from '../lib/meetings-api';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuth } from '../app/auth/AuthContext';
import { MEETING_MANAGER_ROLES, isPathAllowedFor } from '../config/roles';
import { MeetingFormModal } from '../components/meetings/MeetingFormModal';
import { PointFormModal } from '../components/meetings/PointFormModal';
import { MeetingPointCard } from '../components/meetings/MeetingPointCard';
import { GenerateTasksModal } from '../components/meetings/GenerateTasksModal';
import {
  MEETING_STATUSES,
  OPEN_POINT_STATUSES,
  formatDay,
  frequencyLabel,
  metaOf,
  needsWorkItem,
} from '../types/meeting';
import type { MeetingPoint, MeetingStatus } from '../types/meeting';

export function ReunionDetallePage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canManage = Boolean(user && MEETING_MANAGER_ROLES.includes(user.role.code));
  const canTrackTasks = isPathAllowedFor(user?.role.code, '/tareas');

  const { data: meeting, isLoading, isError } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => fetchMeeting(id),
    enabled: Boolean(id),
  });
  const { data: options } = useQuery({ queryKey: ['meeting-options'], queryFn: fetchMeetingOptions });

  const [editing, setEditing] = useState(false);
  const [pointModal, setPointModal] = useState<
    { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; point: MeetingPoint }
  >({ mode: 'closed' });
  const [finishOpen, setFinishOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [minutesNotes, setMinutesNotes] = useState('');
  const [carryOpen, setCarryOpen] = useState(false);
  const [carryFrom, setCarryFrom] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const { data: otherMeetings } = useQuery({
    queryKey: ['meetings', { when: 'all' }],
    queryFn: () => fetchMeetings({ when: 'all' }),
    enabled: carryOpen,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['meeting', id] });
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
    queryClient.invalidateQueries({ queryKey: ['meeting-pending-points'] });
  };
  const onError = (fallback: string) => (err: unknown) =>
    setMessage({ kind: 'error', text: getApiErrorMessage(err, fallback) });

  const statusMutation = useMutation({
    mutationFn: (status: MeetingStatus) => updateMeeting(id, { status }),
    onSuccess: refresh,
    onError: onError('No se pudo cambiar el estado.'),
  });
  const finishMutation = useMutation({
    mutationFn: () => finishMeeting(id, minutesNotes),
    onSuccess: () => {
      setFinishOpen(false);
      refresh();
    },
    onError: onError('No se pudo finalizar la reunión.'),
  });
  const attendanceMutation = useMutation({
    mutationFn: (item: { participantId: string; attended: boolean | null }) =>
      updateAttendance(id, [item]),
    onSuccess: refresh,
    onError: onError('No se pudo registrar la asistencia.'),
  });
  const reorderMutation = useMutation({
    mutationFn: (ids: string[]) => reorderPoints(id, ids),
    onSuccess: refresh,
    onError: onError('No se pudo reordenar.'),
  });
  const carryMutation = useMutation({
    mutationFn: () => carryOverPoints(id, carryFrom),
    onSuccess: (res) => {
      setCarryOpen(false);
      setCarryFrom('');
      setMessage({
        kind: 'ok',
        text:
          res.carried > 0
            ? `Se agregaron ${res.carried} punto${res.carried === 1 ? '' : 's'} pendiente${res.carried === 1 ? '' : 's'} al orden del día.`
            : 'Esa reunión no tenía puntos pendientes para traer.',
      });
      refresh();
    },
    onError: onError('No se pudieron traer los pendientes.'),
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteMeeting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-pending-points'] });
      navigate('/reuniones');
    },
    onError: onError('No se pudo eliminar la reunión.'),
  });

  if (isLoading) return <p className="text-sm text-slate-500">Cargando reunión...</p>;
  if (isError || !meeting) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600">No se encontró la reunión.</p>
        <Link to="/reuniones" className="text-sm text-brand-600 hover:underline">
          ← Volver a Reuniones
        </Link>
      </div>
    );
  }

  const st = metaOf(MEETING_STATUSES, meeting.status);
  const points = meeting.points;
  const resolved = points.filter((p) => p.status === 'RESOLVED').length;
  const open = points.filter((p) => OPEN_POINT_STATUSES.includes(p.status)).length;
  const attendedCount = meeting.participants.filter((p) => p.attended === true).length;
  const isClosed = meeting.status === 'FINISHED' || meeting.status === 'CANCELLED';
  const actionableWithoutTask = points.filter(needsWorkItem).length;

  function movePoint(pointId: string, direction: -1 | 1) {
    const ids = points.map((p) => p.id);
    const i = ids.indexOf(pointId);
    const j = i + direction;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorderMutation.mutate(ids);
  }

  return (
    <div className="space-y-5 pb-10">
      <Link to="/reuniones" className="text-sm text-slate-500 hover:text-slate-700">
        ← Reuniones
      </Link>

      {/* Encabezado */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-800">{meeting.title}</h1>
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${st.color}`}>
                {st.label}
              </span>
            </div>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
              {meeting.area && (
                <span className="rounded bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                  {meeting.area}
                </span>
              )}
              <span>📅 {formatDay(meeting.date, { weekday: 'long' })}</span>
              {meeting.startTime && (
                <span>
                  🕒 {meeting.startTime}
                  {meeting.endTime ? `–${meeting.endTime}` : ''}
                </span>
              )}
              {meeting.location && <span>📍 {meeting.location}</span>}
              <span>🔁 {frequencyLabel(meeting.frequency)}</span>
            </p>
            {meeting.previousMeeting && (
              <p className="mt-1 text-xs text-slate-500">
                Reunión anterior:{' '}
                <Link to={`/reuniones/${meeting.previousMeeting.id}`} className="text-brand-600 hover:underline">
                  {meeting.previousMeeting.title} ({formatDay(meeting.previousMeeting.date)})
                </Link>
              </p>
            )}
            {meeting.nextMeetings.length > 0 && (
              <p className="mt-0.5 text-xs text-slate-500">
                Continúa en:{' '}
                {meeting.nextMeetings.map((n, i) => (
                  <span key={n.id}>
                    {i > 0 && ', '}
                    <Link to={`/reuniones/${n.id}`} className="text-brand-600 hover:underline">
                      {n.title} ({formatDay(n.date)})
                    </Link>
                  </span>
                ))}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/reuniones/${meeting.id}/acta`}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Ver acta
            </Link>
            {canManage && !isClosed && (
              <button
                onClick={() => {
                  setMinutesNotes(meeting.minutesNotes ?? '');
                  setFinishOpen(true);
                }}
                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Finalizar reunión
              </button>
            )}
            {canManage && (
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Editar
              </button>
            )}
          </div>
        </div>

        {meeting.description && (
          <p className="mt-4 whitespace-pre-line border-t border-slate-100 pt-4 text-sm text-slate-600">
            {meeting.description}
          </p>
        )}

        {canManage && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-xs">
            <span className="font-semibold text-slate-500">Estado:</span>
            {MEETING_STATUSES.filter((s) => s.value !== 'FINISHED').map((s) => (
              <button
                key={s.value}
                disabled={meeting.status === s.value || statusMutation.isPending}
                onClick={() => statusMutation.mutate(s.value)}
                className={`rounded-lg border px-2.5 py-1 font-semibold transition-colors ${
                  meeting.status === s.value ? s.color : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s.label}
              </button>
            ))}
            <span className="ml-auto" />
            {confirmDelete ? (
              <span className="flex items-center gap-2">
                <span className="text-red-600">¿Eliminar la reunión con todos sus puntos?</span>
                <button
                  onClick={() => deleteMutation.mutate()}
                  className="rounded bg-red-600 px-2 py-1 font-semibold text-white"
                >
                  Sí, eliminar
                </button>
                <button onClick={() => setConfirmDelete(false)} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">
                  No
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded px-2 py-1 font-medium text-red-600 hover:bg-red-50"
              >
                Eliminar reunión
              </button>
            )}
          </div>
        )}
      </div>

      {message && (
        <div
          className={`flex items-center justify-between rounded-lg px-4 py-2 text-sm ${
            message.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-xs opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Orden del dia */}
        <div className="space-y-3 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-800">Orden del día</h2>
              <p className="text-xs text-slate-500">
                {points.length} punto{points.length === 1 ? '' : 's'} · {resolved} resuelto
                {resolved === 1 ? '' : 's'} · {open} abierto{open === 1 ? '' : 's'}
              </p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                <button
                  onClick={() => setGenerateOpen(true)}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100"
                  title="Crear tareas del Kanban a partir de los puntos"
                >
                  Generar tareas{actionableWithoutTask > 0 ? ` (${actionableWithoutTask})` : ''}
                </button>
                <button
                  onClick={() => setCarryOpen((v) => !v)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Traer pendientes
                </button>
                <button
                  onClick={() => setPointModal({ mode: 'create' })}
                  className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600"
                >
                  + Agregar punto
                </button>
              </div>
            )}
          </div>

          {carryOpen && (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/50 p-3 text-sm">
              <span className="text-slate-600">Traer los puntos abiertos de:</span>
              <select
                value={carryFrom}
                onChange={(e) => setCarryFrom(e.target.value)}
                className="min-w-[240px] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Elegí una reunión...</option>
                {(otherMeetings ?? [])
                  .filter((m) => m.id !== meeting.id && m.pointsSummary.open > 0)
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {formatDay(m.date)} · {m.title} ({m.pointsSummary.open} abiertos)
                    </option>
                  ))}
              </select>
              <button
                onClick={() => carryMutation.mutate()}
                disabled={!carryFrom || carryMutation.isPending}
                className="rounded-lg bg-brand-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
              >
                Traer
              </button>
            </div>
          )}

          {points.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
              Todavía no hay puntos a tratar{canManage ? '. Agregá el primero.' : '.'}
            </div>
          )}
          {points.map((p, i) => (
            <MeetingPointCard
              key={p.id}
              point={p}
              index={i}
              total={points.length}
              meetingId={meeting.id}
              canManage={canManage}
              canTrackTasks={canTrackTasks}
              options={options}
              onEdit={(pt) => setPointModal({ mode: 'edit', point: pt })}
              onMove={movePoint}
            />
          ))}
        </div>

        {/* Participantes + acta */}
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-1 font-semibold text-slate-800">
              Participantes ({meeting.participants.length})
            </h3>
            <p className="mb-3 text-xs text-slate-500">
              {attendedCount} con asistencia confirmada
            </p>
            <ul className="space-y-1.5">
              {meeting.participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {p.name}
                    {!p.userId && <span className="ml-1 text-xs text-slate-400">(externo)</span>}
                  </span>
                  {canManage ? (
                    <span className="flex shrink-0 gap-1">
                      <button
                        title="Asistió"
                        onClick={() =>
                          attendanceMutation.mutate({
                            participantId: p.id,
                            attended: p.attended === true ? null : true,
                          })
                        }
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                          p.attended === true ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        ✓
                      </button>
                      <button
                        title="Ausente"
                        onClick={() =>
                          attendanceMutation.mutate({
                            participantId: p.id,
                            attended: p.attended === false ? null : false,
                          })
                        }
                        className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
                          p.attended === false ? 'bg-red-100 text-red-700' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        ✗
                      </button>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {p.attended === true ? '✓ asistió' : p.attended === false ? '✗ ausente' : ''}
                    </span>
                  )}
                </li>
              ))}
              {meeting.participants.length === 0 && (
                <li className="text-xs text-slate-400">Sin participantes cargados.</li>
              )}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 font-semibold text-slate-800">Observaciones del acta</h3>
            {meeting.minutesNotes ? (
              <p className="whitespace-pre-line text-sm text-slate-600">{meeting.minutesNotes}</p>
            ) : (
              <p className="text-sm italic text-slate-400">
                {meeting.status === 'FINISHED'
                  ? 'Sin observaciones generales.'
                  : 'Se cargan al finalizar la reunión.'}
              </p>
            )}
            {meeting.finishedAt && (
              <p className="mt-2 text-xs text-slate-400">
                Finalizada el{' '}
                {new Date(meeting.finishedAt).toLocaleString('es-AR', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            )}
            {canManage && meeting.status === 'FINISHED' && (
              <button
                onClick={() => {
                  setMinutesNotes(meeting.minutesNotes ?? '');
                  setFinishOpen(true);
                }}
                className="mt-2 text-xs font-medium text-brand-600 hover:underline"
              >
                Editar observaciones
              </button>
            )}
          </div>
        </div>
      </div>

      {generateOpen && (
        <GenerateTasksModal
          meeting={meeting}
          options={options}
          onClose={() => setGenerateOpen(false)}
          onDone={(created) => {
            setGenerateOpen(false);
            setMessage({
              kind: 'ok',
              text: `Se crearon ${created} tarea${created === 1 ? '' : 's'} en el Kanban.`,
            });
          }}
        />
      )}
      {editing && <MeetingFormModal meeting={meeting} onClose={() => setEditing(false)} />}
      {pointModal.mode !== 'closed' && (
        <PointFormModal
          meetingId={meeting.id}
          point={pointModal.mode === 'edit' ? pointModal.point : undefined}
          users={options?.users ?? []}
          onClose={() => setPointModal({ mode: 'closed' })}
        />
      )}
      {finishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold text-slate-800">
              {meeting.status === 'FINISHED' ? 'Observaciones del acta' : 'Finalizar reunión'}
            </h2>
            {meeting.status !== 'FINISHED' && actionableWithoutTask > 0 && (
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-3 py-2 text-xs text-brand-700">
                <span>
                  Hay {actionableWithoutTask} punto{actionableWithoutTask === 1 ? '' : 's'} accionable
                  {actionableWithoutTask === 1 ? '' : 's'} sin tarea. ¿Generarlas ahora?
                </span>
                <button
                  onClick={() => {
                    setFinishOpen(false);
                    setGenerateOpen(true);
                  }}
                  className="rounded-lg bg-brand-500 px-2 py-1 font-semibold text-white hover:bg-brand-600"
                >
                  Generar tareas
                </button>
              </div>
            )}
            {meeting.status !== 'FINISHED' && open > 0 && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Quedan {open} punto{open === 1 ? '' : 's'} abierto{open === 1 ? '' : 's'}. Podés
                traerlos a la próxima reunión con “Traer pendientes”.
              </p>
            )}
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Observaciones generales (opcional)
            </label>
            <textarea
              value={minutesNotes}
              onChange={(e) => setMinutesNotes(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setFinishOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => finishMutation.mutate()}
                disabled={finishMutation.isPending}
                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                {meeting.status === 'FINISHED' ? 'Guardar' : 'Finalizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
