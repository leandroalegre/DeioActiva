import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchComments, createComment } from '../../lib/comments-api';
import { WORK_ITEM_PRIORITIES, WORK_ITEM_STATUSES, WORK_ITEM_TYPES } from '../../types/work-item';
import type { WorkItem } from '../../types/work-item';

// Modal de detalle de una tarea: se abre al hacer click en una tarjeta del Kanban.
// Agregado a pedido para que, ademas de ver la descripcion original, los desarrolladores
// puedan dejar comentarios contando como se implemento/completo la tarea -- asi cualquiera
// que abra la tarjeta despues entiende por que esta en el estado en el que esta.
// Reutiliza el modelo WorkItemComment y los endpoints GET/POST /comments, que ya existian
// en el backend desde Fase 1 pero no tenian ninguna pantalla que los usara.
export function WorkItemDetailModal({ item, onClose }: { item: WorkItem; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', item.id],
    queryFn: () => fetchComments(item.id),
  });

  const mutation = useMutation({
    mutationFn: (value: string) => createComment(item.id, value),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['comments', item.id] });
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
    },
    onError: () => setError('No se pudo guardar el comentario. Intentá de nuevo.'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) return;
    mutation.mutate(trimmed);
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
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
            estado actual.
          </p>

          {isLoading && <p className="text-xs text-slate-400">Cargando comentarios...</p>}

          {!isLoading && (comments?.length ?? 0) === 0 && (
            <p className="mb-3 text-xs text-slate-400">Todavía no hay comentarios.</p>
          )}

          <ul className="mb-3 space-y-2">
            {comments?.map((c) => (
              <li key={c.id} className="rounded-lg bg-slate-50 p-2">
                <div className="mb-0.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">{c.author.fullName}</span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(c.createdAt).toLocaleString('es-AR')}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{c.text}</p>
              </li>
            ))}
          </ul>

          <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Ej: se implementó usando X, quedó pendiente Y..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
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
