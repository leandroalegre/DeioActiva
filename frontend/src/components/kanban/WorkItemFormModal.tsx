import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createWorkItem, deleteWorkItem, updateWorkItem } from '../../lib/work-items-api';
import { fetchModuleTree, flattenModules } from '../../lib/modules-api';
import { fetchMilestones } from '../../lib/milestones-api';
import { getApiErrorMessage } from '../../lib/api-client';
import { WORK_ITEM_PRIORITIES, WORK_ITEM_TYPES } from '../../types/work-item';
import type { WorkItem, WorkItemPriority, WorkItemType } from '../../types/work-item';

// Modal de creacion/edicion de una tarea (WorkItem). Antes solo existia NewWorkItemModal
// (crear); se unifico con edicion a pedido del usuario ("no me deja editar una tarea"),
// siguiendo el mismo patron create+edit que ya usan Modulos/Usuarios/Hitos.
// Tambien permite asociar la tarea a un Hito (opcional), para el seguimiento de progreso
// por hito en el Roadmap.
export function WorkItemFormModal({
  workItem,
  onClose,
}: {
  workItem?: WorkItem;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(workItem);

  const { data: moduleTree } = useQuery({ queryKey: ['modules'], queryFn: fetchModuleTree });
  const moduleOptions = flattenModules(moduleTree ?? []);
  const { data: milestones } = useQuery({ queryKey: ['milestones'], queryFn: fetchMilestones });

  const [title, setTitle] = useState(workItem?.title ?? '');
  const [moduleId, setModuleId] = useState(workItem?.moduleId ?? '');
  const [type, setType] = useState<WorkItemType>(workItem?.type ?? 'TASK');
  const [priority, setPriority] = useState<WorkItemPriority>(workItem?.priority ?? 'MEDIUM');
  const [description, setDescription] = useState(workItem?.description ?? '');
  const [plannedStart, setPlannedStart] = useState(workItem?.plannedStart?.slice(0, 10) ?? '');
  const [plannedEnd, setPlannedEnd] = useState(workItem?.plannedEnd?.slice(0, 10) ?? '');
  const [dueDate, setDueDate] = useState(workItem?.dueDate?.slice(0, 10) ?? '');
  const [milestoneId, setMilestoneId] = useState(workItem?.milestoneId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        title,
        moduleId,
        type,
        priority,
        description: description || undefined,
        plannedStart: plannedStart || undefined,
        plannedEnd: plannedEnd || undefined,
        dueDate: dueDate || undefined,
        milestoneId: milestoneId || null,
      };
      return isEditing ? updateWorkItem(workItem!.id, payload) : createWorkItem(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      onClose();
    },
    onError: () => setError('No se pudo guardar la tarea. Revisá los datos e intentá de nuevo.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWorkItem(workItem!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-items'] });
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo eliminar la tarea. Intentá de nuevo.')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!moduleId) {
      setError('Elegí un módulo.');
      return;
    }
    if (plannedStart && plannedEnd && plannedEnd < plannedStart) {
      setError('La fecha de fin planificada no puede ser anterior a la de inicio.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          {isEditing ? 'Editar tarea' : 'Nueva tarea'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Módulo</label>
            <select
              required
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Elegir...</option>
              {moduleOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WorkItemType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {WORK_ITEM_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WorkItemPriority)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {WORK_ITEM_PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Hito asociado (opcional)
            </label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Sin hito</option>
              {milestones?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-400">
              Si esta tarea es parte de un hito del Roadmap, elegilo acá para que cuente en su
              progreso.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Descripción (opcional)
            </label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Inicio planificado (opcional)
              </label>
              <input
                type="date"
                value={plannedStart}
                onChange={(e) => setPlannedStart(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Fin planificado (opcional)
              </label>
              <input
                type="date"
                value={plannedEnd}
                onChange={(e) => setPlannedEnd(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-400">
            Cargá estas dos fechas para que la tarea aparezca en la vista Gantt.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Fecha límite (opcional)
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <p className="mt-1 text-xs text-slate-400">
              Distinta del fin planificado: si se pasa esta fecha y la tarea no está
              Completada/Descartada, la tarjeta del Kanban se marca como Vencida.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {isEditing && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar tarea
                </button>
              )}
              {isEditing && confirmDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">¿Eliminar? No se puede deshacer.</span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
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
                {mutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear tarea'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
