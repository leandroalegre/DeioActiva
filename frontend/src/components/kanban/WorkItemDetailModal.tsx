import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchComments, createComment, updateComment } from '../../lib/comments-api';
import { WORK_ITEM_PRIORITIES, WORK_ITEM_STATUSES, WORK_ITEM_TYPES } from '../../types/work-item';
import type { WorkItem } from '../../types/work-item';
import type { WorkItemComment } from '../../types/comment';

// Modal de detalle de una tarea: se abre al hacer click en una tarjeta del Kanban.
// Agregado a pedido para que, ademas de ver la descripcion original, los desarrolladores
// puedan dejar comentarios contando como se implemento/completo la tarea -- asi cualquiera
// que abra la tarjeta despues entiende por que esta en el estado en el que esta.
// Reutiliza el modelo WorkItemComment y los endpoints GET/POST /comments, que ya existian
// en el backend desde Fase 1 pero no tenian ninguna pantalla que los usara.
//
// Cada comentario puede llevar ademas una fecha de seguimiento opcional (distinta del
// dueDate de la tarea): sirve para marcar un pendiente puntual sobre lo que dice el
// comentario ("revisar esto antes del 20/09") sin tener que crear una tarea nueva. Un
// desarrollador lo marca como resuelto cuando lo atendio.
function isCommentOverdue(c: WorkItemComment): boolean {
  if (!c.dueDate || c.resolved) return false;
  return new Date(c.dueDate) < new Date();
}

function formatShortDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC' });
}

export function WorkItemDetailModal({
  item,
  onClose,
  onEdit,
}: {
  item: WorkItem;
  onClose: () => void;
  onEdit: (item: WorkItem) => void;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', item.id],
    queryFn: () => fetchComments(item.id),
  });

  const mutation = useMutation({
    mutationFn: () => createComment(item.id, text.trim(), dueDate || undefined),
    onSuccess: () => {
      setText('');
      setDueDate('');
      queryClient.invalidateQueries({ queryKey: ['comments', item.id] });
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
    onError: () => setError('No se pudo guardar el comentario. Intentá de nuevo.'),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) =>
      updateComment(id, { resolved }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['comments', item.id] }),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text.trim()) return;
    mutation.mutate();
  }

  const type = WORK_ITEM_TYPES.find((t) => t.value === item.type);
  const priority = WORK_ITEM_PRIORITIES.find((p) => p.value === item.priority);
  const status = WORK_ITEM_STATUSES.find((s) => s.value === item.status);

  function formatDate(value?: string | null) {
    if (!value) return null;
    // Mismo motivo que en RoadmapPage: plannedStart/plannedEnd son "solo fecha" en UTC.
    return new Date(value).toLocaleDateString('es-AR', { timeZone: 'UTC' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-800">{item.title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => onEdit(item)}
              className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
            >
              Editar
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              ✕
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
            {type?.label ?? item.type}
          </span>
          {priority && (
            <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${priority.color}`}>
              {priority.label}
            </span>
          )}
          <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700">
            {status?.label ?? item.status}
          </span>
        </div>

        <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500">
          <div>
            <dt className="inline font-medium text-slate-600">Módulo: </dt>
            <dd className="inline">{item.module?.name}</dd>
          </div>
          {item.milestone && (
            <div>
              <dt className="inline font-medium text-slate-600">Hito: </dt>
              <dd className="inline">{item.milestone.name}</dd>
            </div>
          )}
          {item.assignedTo && (
            <div>
              <dt className="inline font-medium text-slate-600">Asignado a: </dt>
              <dd className="inline">{item.assignedTo.fullName}</dd>
            </div>
          )}
          {formatDate(item.plannedStart) && (
            <div>
              <dt className="inline font-medium text-slate-600">Inicio planificado: </dt>
              <dd className="inline">{formatDate(item.plannedStart)}</dd>
            </div>
          )}
          {formatDate(item.plannedEnd) && (
            <div>
              <dt className="inline font-medium text-slate-600">Fin planificado: </dt>
              <dd className="inline">{formatDate(item.plannedEnd)}</dd>
            </div>
          )}
        </dl>

        {item.blocked && (
          <p className="mb-4 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
            Bloqueada{item.blockReason ? `: ${item.blockReason}` : ''}
          </p>
        )}

        {item.description && (
          <div className="mb-4">
            <h3 className="mb-1 text-sm font-semibold text-slate-700">Descripción</h3>
            <p className="whitespace-pre-wrap text-sm text-slate-600">{item.description}</p>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">
            Comentarios {comments && comments.length > 0 ? `(${comments.length})` : ''}
          </h3>
          <p className="mb-3 text-xs text-slate-400">
            Contá acá cómo se implementó o completó la tarea, para que quede el porqué de su
            estado actual. Si el comentario deja un pendiente puntual, ponele una fecha de
            seguimiento y marcalo resuelto cuando lo atiendas.
          </p>

          {isLoading && <p className="text-xs text-slate-400">Cargando comentarios...</p>}

          {!isLoading && (comments?.length ?? 0) === 0 && (
            <p className="mb-3 text-xs text-slate-400">Todavía no hay comentarios.</p>
          )}

          <ul className="mb-3 space-y-2">
            {comments?.map((c) => {
              const overdue = isCommentOverdue(c);
              return (
                <li
                  key={c.id}
                  className={`rounded-lg p-2 ${overdue ? 'bg-red-50' : 'bg-slate-50'}`}
                >
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">{c.author.fullName}</span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(c.createdAt).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm text-slate-600">{c.text}</p>
                  {c.dueDate && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className={`text-[11px] font-medium ${
                          c.resolved ? 'text-slate-400 line-through' : overdue ? 'text-red-600' : 'text-slate-500'
                        }`}
                      >
                        {overdue ? '🚩 ' : '📅 '}
                        Seguimiento: {formatShortDate(c.dueDate)}
                      </span>
                      <button
                        onClick={() =>
                          resolveMutation.mutate({ id: c.id, resolved: !c.resolved })
                        }
                        disabled={resolveMutation.isPending}
                        className="text-[11px] font-medium text-brand-600 hover:underline disabled:opacity-60"
                      >
                        {c.resolved ? 'Reabrir' : 'Marcar resuelto'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Ej: se implementó usando X, quedó pendiente Y..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Fecha de seguimiento (opcional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={mutation.isPending || !text.trim()}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {mutation.isPending ? 'Guardando...' : 'Agregar comentario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
