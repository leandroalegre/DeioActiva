import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { generateWorkItems } from '../../lib/meetings-api';
import { getApiErrorMessage } from '../../lib/api-client';
import {
  POINT_STATUSES,
  POINT_TYPES,
  POINT_TYPE_TO_WORK_ITEM_TYPE,
  metaOf,
  needsWorkItem,
} from '../../types/meeting';
import type { Meeting, MeetingOptions } from '../../types/meeting';
import { WORK_ITEM_PRIORITIES, WORK_ITEM_TYPES } from '../../types/work-item';
import type { WorkItemPriority, WorkItemType } from '../../types/work-item';

interface Row {
  selected: boolean;
  moduleId: string;
  type: WorkItemType;
  priority: WorkItemPriority;
  assignedToId: string;
}

const SELECT =
  'w-full rounded-lg border border-slate-300 px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

// "Generar tareas": convierte en lote los puntos de la reunion en tareas del Kanban. Se
// listan los puntos sin tarea (no descartados); vienen tildados los accionables y abiertos
// (Requerimiento, Accion, Seguimiento). Cada fila se puede ajustar antes de confirmar.
export function GenerateTasksModal({
  meeting,
  options,
  onClose,
  onDone,
}: {
  meeting: Meeting;
  options?: MeetingOptions;
  onClose: () => void;
  onDone: (created: number) => void;
}) {
  const queryClient = useQueryClient();
  const candidates = useMemo(
    () => meeting.points.filter((p) => !p.workItemId && p.status !== 'CANCELLED'),
    [meeting.points],
  );

  const [rows, setRows] = useState<Record<string, Row>>(() =>
    Object.fromEntries(
      candidates.map((p) => [
        p.id,
        {
          selected: needsWorkItem(p),
          moduleId: '',
          type: POINT_TYPE_TO_WORK_ITEM_TYPE[p.type],
          priority: 'MEDIUM' as WorkItemPriority,
          assignedToId: p.responsibleId ?? '',
        },
      ]),
    ),
  );
  const [defaultModule, setDefaultModule] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedIds = candidates.filter((p) => rows[p.id]?.selected).map((p) => p.id);
  const missingModule = selectedIds.filter((id) => !rows[id].moduleId).length;

  function patchRow(id: string, patch: Partial<Row>) {
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function applyModuleToSelected(moduleId: string) {
    setDefaultModule(moduleId);
    setRows((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id].selected) next[id] = { ...next[id], moduleId };
      }
      return next;
    });
  }

  const mutation = useMutation({
    mutationFn: () =>
      generateWorkItems(
        meeting.id,
        selectedIds.map((pointId) => ({
          pointId,
          moduleId: rows[pointId].moduleId,
          type: rows[pointId].type,
          priority: rows[pointId].priority,
          assignedToId: rows[pointId].assignedToId || null,
        })),
      ),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['meeting', meeting.id] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-pending-points'] });
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      onDone(res.created);
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudieron crear las tareas.')),
  });

  function submit() {
    setError(null);
    if (selectedIds.length === 0) {
      setError('Elegí al menos un punto.');
      return;
    }
    if (missingModule > 0) {
      setError(`Falta elegir el módulo en ${missingModule} punto${missingModule === 1 ? '' : 's'}.`);
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Generar tareas desde la reunión</h2>
          <p className="text-xs text-slate-500">
            Cada punto elegido crea una tarea en el Kanban con su resolución y la reunión de
            origen en la descripción. Cuando la tarea se complete o descarte, el punto se
            actualiza solo.
          </p>
        </div>

        {candidates.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-slate-400">
            Todos los puntos de esta reunión ya tienen tarea (o están descartados).
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50 px-6 py-3 text-sm">
              <span className="text-slate-600">Módulo para los seleccionados:</span>
              <select
                value={defaultModule}
                onChange={(e) => applyModuleToSelected(e.target.value)}
                className="min-w-[220px] rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Elegir...</option>
                {(options?.modules ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.parentId ? '— ' : ''}
                    {m.name}
                  </option>
                ))}
              </select>
              <span className="ml-auto text-xs text-slate-500">
                {selectedIds.length} de {candidates.length} seleccionados
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-3">
              <table className="w-full text-left text-sm">
                <thead className="text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="w-8 py-2" />
                    <th className="py-2 pr-2">Punto</th>
                    <th className="w-44 py-2 pr-2">Módulo</th>
                    <th className="w-32 py-2 pr-2">Tipo de tarea</th>
                    <th className="w-24 py-2 pr-2">Prioridad</th>
                    <th className="w-40 py-2">Asignada a</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {candidates.map((p) => {
                    const row = rows[p.id];
                    const ty = metaOf(POINT_TYPES, p.type);
                    const st = metaOf(POINT_STATUSES, p.status);
                    return (
                      <tr key={p.id} className={row.selected ? '' : 'opacity-50'}>
                        <td className="py-2 align-top">
                          <input
                            type="checkbox"
                            checked={row.selected}
                            onChange={(e) =>
                              patchRow(p.id, {
                                selected: e.target.checked,
                                moduleId: row.moduleId || (e.target.checked ? defaultModule : ''),
                              })
                            }
                            className="mt-1 rounded border-slate-300 text-brand-500"
                          />
                        </td>
                        <td className="py-2 pr-2 align-top">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${ty.color}`}>
                              {ty.label}
                            </span>
                            <span className="font-medium text-slate-800">{p.title}</span>
                            <span className={`rounded border px-1.5 py-0.5 text-[10px] ${st.color}`}>
                              {st.label}
                            </span>
                          </div>
                          {p.resolution && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                              Resolución: {p.resolution}
                            </p>
                          )}
                        </td>
                        <td className="py-2 pr-2 align-top">
                          <select
                            value={row.moduleId}
                            disabled={!row.selected}
                            onChange={(e) => patchRow(p.id, { moduleId: e.target.value })}
                            className={`${SELECT} ${row.selected && !row.moduleId ? 'border-amber-400' : ''}`}
                          >
                            <option value="">Módulo...</option>
                            {(options?.modules ?? []).map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.parentId ? '— ' : ''}
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2 align-top">
                          <select
                            value={row.type}
                            disabled={!row.selected}
                            onChange={(e) => patchRow(p.id, { type: e.target.value as WorkItemType })}
                            className={SELECT}
                          >
                            {WORK_ITEM_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 pr-2 align-top">
                          <select
                            value={row.priority}
                            disabled={!row.selected}
                            onChange={(e) =>
                              patchRow(p.id, { priority: e.target.value as WorkItemPriority })
                            }
                            className={SELECT}
                          >
                            {WORK_ITEM_PRIORITIES.map((pr) => (
                              <option key={pr.value} value={pr.value}>
                                {pr.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 align-top">
                          <select
                            value={row.assignedToId}
                            disabled={!row.selected}
                            onChange={(e) => patchRow(p.id, { assignedToId: e.target.value })}
                            className={SELECT}
                          >
                            <option value="">Sin asignar</option>
                            {(options?.users ?? []).map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.fullName}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {error && <p className="px-6 pb-2 text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          {candidates.length > 0 && (
            <button
              onClick={submit}
              disabled={mutation.isPending || selectedIds.length === 0}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {mutation.isPending
                ? 'Creando...'
                : `Crear ${selectedIds.length} tarea${selectedIds.length === 1 ? '' : 's'}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
