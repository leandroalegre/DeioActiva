import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWorkItems, updateWorkItemStatus } from '../lib/work-items-api';
import { WORK_ITEM_STATUSES } from '../types/work-item';
import type { WorkItem, WorkItemStatus } from '../types/work-item';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { NewWorkItemModal } from '../components/kanban/NewWorkItemModal';

// Tablero Kanban de Tareas (WorkItem). Reemplaza el placeholder de Fase 1: agregado a
// pedido despues de la entrega inicial, reutilizando GET/PATCH /work-items ya existentes.
export function TareasPage() {
  const queryClient = useQueryClient();
  const [showNewModal, setShowNewModal] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['work-items'],
    queryFn: fetchWorkItems,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkItemStatus }) =>
      updateWorkItemStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-items'] }),
  });

  const byStatus = useMemo(() => {
    const map = new Map<WorkItemStatus, WorkItem[]>();
    for (const s of WORK_ITEM_STATUSES) map.set(s.value, []);
    for (const item of items ?? []) {
      map.get(item.status)?.push(item);
    }
    return map;
  }, [items]);

  function handleDragStart(e: React.DragEvent, item: WorkItem) {
    setDraggedId(item.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDrop(status: WorkItemStatus) {
    if (!draggedId) return;
    const current = items?.find((i) => i.id === draggedId);
    if (current && current.status !== status) {
      statusMutation.mutate({ id: draggedId, status });
    }
    setDraggedId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Tareas</h1>
          <p className="text-sm text-slate-500">Arrastrá una tarjeta para cambiar su estado.</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          + Nueva tarea
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando tareas...</p>}
      {isError && (
        <p className="text-sm text-red-600">
          No se pudieron cargar las tareas. Revisá que el backend esté corriendo.
        </p>
      )}

      {!isLoading && !isError && (
        <div className="flex flex-1 gap-4 overflow-x-auto pb-2">
          {WORK_ITEM_STATUSES.map((s) => (
            <KanbanColumn
              key={s.value}
              status={s.value}
              label={s.label}
              items={byStatus.get(s.value) ?? []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      {showNewModal && <NewWorkItemModal onClose={() => setShowNewModal(false)} />}
    </div>
  );
}
