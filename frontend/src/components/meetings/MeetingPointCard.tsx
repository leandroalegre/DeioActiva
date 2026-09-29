import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  addPointNote,
  createWorkItemFromPoint,
  deletePoint,
  updatePoint,
} from '../../lib/meetings-api';
import { getApiErrorMessage } from '../../lib/api-client';
import {
  POINT_STATUSES,
  POINT_TYPES,
  formatDay,
  isPointOverdue,
  metaOf,
} from '../../types/meeting';
import type { MeetingOptions, MeetingPoint, MeetingPointStatus } from '../../types/meeting';
import { WORK_ITEM_PRIORITIES, WORK_ITEM_TYPES, WORK_ITEM_STATUSES } from '../../types/work-item';
import type { WorkItemPriority, WorkItemType } from '../../types/work-item';

// Un punto del orden del dia dentro del detalle de la reunion: estado, responsable, fecha de
// control, resolucion (editable en linea) y el historial de avances de seguimiento.
export function MeetingPointCard({
  point,
  index,
  total,
  meetingId,
  canManage,
  canTrackTasks,
  options,
  onEdit,
  onMove,
}: {
  point: MeetingPoint;
  index: number;
  total: number;
  meetingId: string;
  canManage: boolean;
  canTrackTasks: boolean;
  options?: MeetingOptions;
  onEdit: (p: MeetingPoint) => void;
  onMove: (pointId: string, direction: -1 | 1) => void;
}) {
  const queryClient = useQueryClient();
  const [editingResolution, setEditingResolution] = useState(false);
  const [resolution, setResolution] = useState(point.resolution ?? '');
  const [showNotes, setShowNotes] = useState(false);
  const [note, setNote] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [taskForm, setTaskForm] = useState(false);
  const [moduleId, setModuleId] = useState('');
  const [taskType, setTaskType] = useState<WorkItemType>('TASK');
  const [priority, setPriority] = useState<WorkItemPriority>('MEDIUM');
  const [error, setError] = useState<string | null>(null);

  const typeMeta = metaOf(POINT_TYPES, point.type);
  const statusMeta = metaOf(POINT_STATUSES, point.status);
  const overdue = isPointOverdue(point);
  const closed = point.status === 'RESOLVED' || point.status === 'CANCELLED';

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['meeting', meetingId] });
    queryClient.invalidateQueries({ queryKey: ['meetings'] });
    queryClient.invalidateQueries({ queryKey: ['meeting-pending-points'] });
  };

  const patch = useMutation({
    mutationFn: (payload: Parameters<typeof updatePoint>[1]) => updatePoint(point.id, payload),
    onSuccess: () => {
      setEditingResolution(false);
      refresh();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo actualizar el punto.')),
  });

  const noteMutation = useMutation({
    mutationFn: () => addPointNote(point.id, note.trim()),
    onSuccess: () => {
      setNote('');
      refresh();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo guardar el avance.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deletePoint(point.id),
    onSuccess: refresh,
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo eliminar el punto.')),
  });

  const taskMutation = useMutation({
    mutationFn: () => createWorkItemFromPoint(point.id, { moduleId, type: taskType, priority }),
    onSuccess: () => {
      setTaskForm(false);
      refresh();
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo crear la tarea.')),
  });

  function submitNote(e: FormEvent) {
    e.preventDefault();
    if (!note.trim()) return;
    setError(null);
    noteMutation.mutate();
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        overdue ? 'border-red-300' : 'border-slate-200'
      } ${point.status === 'CANCELLED' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
            closed ? 'bg-green-100 text-green-700' : 'bg-brand-50 text-brand-700'
          }`}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${typeMeta.color}`}>
              {typeMeta.label}
            </span>
            <p
              className={`font-medium text-slate-800 ${
                point.status === 'CANCELLED' ? 'line-through' : ''
              }`}
            >
              {point.title}
            </p>
            {overdue && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-600">
                🚩 Vencido
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span>
              Responsable:{' '}
              <span className="font-medium text-slate-700">
                {point.responsible?.fullName ?? 'sin asignar'}
              </span>
            </span>
            {point.dueDate && (
              <span className={overdue ? 'font-semibold text-red-600' : ''}>
                Control: {formatDay(point.dueDate)}
              </span>
            )}
            {point.carriedFrom && (
              <Link
                to={`/reuniones/${point.carriedFrom.meeting.id}`}
                className="text-brand-600 hover:underline"
              >
                ↩ Viene de “{point.carriedFrom.meeting.title}” ({formatDay(point.carriedFrom.meeting.date)})
              </Link>
            )}
            {point.carriedTo && (
              <Link
                to={`/reuniones/${point.carriedTo.meeting.id}`}
                className="text-orange-600 hover:underline"
              >
                ↪ Trasladado a “{point.carriedTo.meeting.title}” ({formatDay(point.carriedTo.meeting.date)})
              </Link>
            )}
          </div>

          {point.workItem && (
            <div className="mt-2 rounded-lg border border-slate-100 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-slate-500">
                  Tarea:{' '}
                  {canTrackTasks ? (
                    <Link to="/tareas" className="font-medium text-brand-600 hover:underline">
                      {point.workItem.title}
                    </Link>
                  ) : (
                    <span className="font-medium text-slate-700">{point.workItem.title}</span>
                  )}
                </span>
                <span className="font-semibold text-slate-600">
                  {WORK_ITEM_STATUSES.find((s) => s.value === point.workItem!.status)?.label ??
                    point.workItem.status}
                  {' · '}
                  {point.workItem.status === 'COMPLETED' ? 100 : (point.workItem.progressPercentage ?? 0)}%
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    point.workItem.status === 'COMPLETED'
                      ? 'bg-green-500'
                      : point.workItem.status === 'BLOCKED'
                        ? 'bg-red-500'
                        : 'bg-brand-500'
                  }`}
                  style={{
                    width: `${point.workItem.status === 'COMPLETED' ? 100 : (point.workItem.progressPercentage ?? 0)}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                El estado del punto se actualiza solo cuando la tarea se completa o descarta.
              </p>
            </div>
          )}

          {point.description && (
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{point.description}</p>
          )}

          {/* Resolucion */}
          <div className="mt-3 rounded-lg bg-slate-50 p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resolución
              </span>
              {canManage && !editingResolution && (
                <button
                  onClick={() => {
                    setResolution(point.resolution ?? '');
                    setEditingResolution(true);
                  }}
                  className="text-xs font-medium text-brand-600 hover:underline"
                >
                  {point.resolution ? 'Editar' : 'Cargar resolución'}
                </button>
              )}
            </div>
            {editingResolution ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() => setEditingResolution(false)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => patch.mutate({ resolution: resolution.trim() || null })}
                    disabled={patch.isPending}
                    className="rounded-lg border border-brand-500 px-2 py-1 text-xs font-semibold text-brand-600 hover:bg-brand-50 disabled:opacity-60"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() =>
                      patch.mutate({ resolution: resolution.trim() || null, status: 'RESOLVED' })
                    }
                    disabled={patch.isPending || !resolution.trim()}
                    className="rounded-lg bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    Guardar y marcar resuelto
                  </button>
                </div>
              </div>
            ) : point.resolution ? (
              <p className="whitespace-pre-line text-sm text-slate-700">{point.resolution}</p>
            ) : (
              <p className="text-sm italic text-slate-400">Sin resolución registrada.</p>
            )}
          </div>

          {/* Avances / seguimiento */}
          <div className="mt-2">
            <button
              onClick={() => setShowNotes((v) => !v)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              {showNotes ? '▾' : '▸'} Seguimiento ({point.notes.length})
            </button>
            {showNotes && (
              <div className="mt-2 space-y-2 border-l-2 border-slate-100 pl-3">
                {point.notes.map((n) => (
                  <div key={n.id} className="text-sm">
                    <p className="whitespace-pre-line text-slate-700">{n.text}</p>
                    <p className="text-[11px] text-slate-400">
                      {n.author.fullName} ·{' '}
                      {new Date(n.createdAt).toLocaleString('es-AR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                ))}
                {point.notes.length === 0 && (
                  <p className="text-xs text-slate-400">Todavía no hay avances cargados.</p>
                )}
                <form onSubmit={submitNote} className="flex gap-2">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Agregar avance..."
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={noteMutation.isPending || !note.trim()}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Crear tarea desde el punto */}
          {taskForm && (
            <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-brand-100 bg-brand-50/50 p-3 sm:grid-cols-4">
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm sm:col-span-2"
              >
                <option value="">Módulo...</option>
                {(options?.modules ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.parentId ? '— ' : ''}
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as WorkItemType)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              >
                {WORK_ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              >
                {WORK_ITEM_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2 sm:col-span-4">
                <button
                  onClick={() => setTaskForm(false)}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => taskMutation.mutate()}
                  disabled={!moduleId || taskMutation.isPending}
                  className="rounded-lg bg-brand-500 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
                >
                  Crear tarea en el Kanban
                </button>
              </div>
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>

        {/* Columna derecha: estado + acciones */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          {canManage ? (
            <select
              value={point.status}
              onChange={(e) => patch.mutate({ status: e.target.value as MeetingPointStatus })}
              className={`rounded-lg border px-2 py-1 text-xs font-semibold ${statusMeta.color}`}
            >
              {POINT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          ) : (
            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${statusMeta.color}`}>
              {statusMeta.label}
            </span>
          )}
          {canManage && (
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => onMove(point.id, -1)}
                disabled={index === 0}
                title="Subir"
                className="rounded px-1.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                ▲
              </button>
              <button
                onClick={() => onMove(point.id, 1)}
                disabled={index === total - 1}
                title="Bajar"
                className="rounded px-1.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
              >
                ▼
              </button>
              <button
                onClick={() => onEdit(point)}
                className="rounded px-2 py-1 font-medium text-brand-600 hover:bg-brand-50"
              >
                Editar
              </button>
            </div>
          )}
          {canManage && !point.workItem && !taskForm && (
            <button
              onClick={() => setTaskForm(true)}
              className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
              title="Crear una tarea del Kanban a partir de este punto"
            >
              + Tarea
            </button>
          )}
          {canManage &&
            (confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => deleteMutation.mutate()}
                  className="rounded bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="rounded px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                Quitar
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
