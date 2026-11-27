import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchWorkItems, updateWorkItemStatus } from '../lib/work-items-api';
import { WORK_ITEM_AREAS, WORK_ITEM_STATUSES } from '../types/work-item';
import type { WorkItem, WorkItemArea, WorkItemStatus } from '../types/work-item';
import { KanbanColumn } from '../components/kanban/KanbanColumn';
import { WorkItemFormModal } from '../components/kanban/WorkItemFormModal';
import { WorkItemDetailModal } from '../components/kanban/WorkItemDetailModal';
import { QaReportFormModal } from '../components/kanban/QaReportFormModal';
import { QaProgressSummary } from '../components/kanban/QaProgressSummary';
import { useAuth } from '../app/auth/AuthContext';
import { isQaRestricted } from '../config/roles';

// Tablero Kanban de Tareas (WorkItem). Reemplaza el placeholder de Fase 1: agregado a
// pedido despues de la entrega inicial, reutilizando GET/PATCH /work-items ya existentes.
export function TareasPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  // Perfil QA: ve todas las columnas pero solo sus reportes y las tarjetas tildadas "Visible
  // para QA" (lo filtra el backend), carga
  // reportes nuevos en "QA / Reportes" y no mueve ni edita tarjetas.
  const qa = isQaRestricted(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [formModal, setFormModal] = useState<
    { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; item: WorkItem }
  >({ mode: 'closed' });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  const {
    data: items,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['work-items'],
    queryFn: fetchWorkItems,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkItemStatus }) =>
      updateWorkItemStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['work-items'] }),
  });

  const [areaFilter, setAreaFilter] = useState<WorkItemArea | 'ALL'>('ALL');
  // En celular se ve una columna a la vez; se elige con las pestañas de estado.
  const [mobileStatus, setMobileStatus] = useState<WorkItemStatus | null>(null);

  const filteredItems = useMemo(
    () => (areaFilter === 'ALL' ? items : items?.filter((i) => i.area === areaFilter)),
    [items, areaFilter],
  );

  const byStatus = useMemo(() => {
    const map = new Map<WorkItemStatus, WorkItem[]>();
    for (const s of WORK_ITEM_STATUSES) map.set(s.value, []);
    for (const item of filteredItems ?? []) {
      map.get(item.status)?.push(item);
    }
    return map;
  }, [filteredItems]);

  const activeMobileStatus =
    mobileStatus ??
    WORK_ITEM_STATUSES.find((s) => (byStatus.get(s.value)?.length ?? 0) > 0)?.value ??
    WORK_ITEM_STATUSES[0].value;

  // Si el detalle abierto quedo desactualizado (por ej. despues de agregar un comentario o
  // de refrescar la lista), lo sincronizamos con la version mas nueva del mismo item.
  const selected = selectedItem
    ? (items?.find((i) => i.id === selectedItem.id) ?? selectedItem)
    : null;

  // /tareas?tarea=<id> abre el detalle de esa tarea (lo usan los avisos de la campanita).
  const linkedId = searchParams.get('tarea');
  useEffect(() => {
    if (!linkedId || !items) return;
    const found = items.find((i) => i.id === linkedId);
    if (found) setSelectedItem(found);
    setSearchParams({}, { replace: true });
  }, [linkedId, items, setSearchParams]);

  function handleDragStart(e: React.DragEvent, item: WorkItem) {
    if (qa) return;
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
    <div className="flex min-h-full flex-col md:h-full">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Tareas</h1>
          <p className="text-sm text-slate-500">
            {qa
              ? 'Acá ves los reportes de QA y las tareas que el equipo te muestra, y en qué etapa está cada una. Hacé click en una tarjeta para ver el detalle y comentar.'
              : (
                  <>
                    <span className="md:hidden">
                      Elegí un estado arriba del tablero y tocá una tarjeta para ver el detalle,
                      comentar o cambiarle el estado.
                    </span>
                    <span className="hidden md:inline">
                      Arrastrá una tarjeta para cambiar su estado. Hacé click para ver el detalle y
                      dejar comentarios.
                    </span>
                  </>
                )}
          </p>
        </div>
        <button
          onClick={() => setFormModal({ mode: 'create' })}
          className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          {qa ? '+ Reportar problema' : '+ Nueva tarea'}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-slate-600">Area:</label>
        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value as WorkItemArea | 'ALL')}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="ALL">Todas</option>
          {WORK_ITEM_AREAS.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando tareas...</p>}
      {isError && (
        <p className="text-sm text-red-600">
          No se pudieron cargar las tareas. Revisá que el backend esté corriendo.
        </p>
      )}

      {qa && !isLoading && !isError && (
        <div className="mt-4">
          <QaProgressSummary items={filteredItems ?? []} userId={user?.id} />
        </div>
      )}

      {!isLoading && !isError && (
        <div
          className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden"
          role="tablist"
          aria-label="Estados"
        >
          {WORK_ITEM_STATUSES.map((s) => {
            const active = s.value === activeMobileStatus;
            return (
              <button
                key={s.value}
                role="tab"
                aria-selected={active}
                onClick={() => setMobileStatus(s.value)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium ${
                  active
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                {s.label}
                <span
                  className={`rounded-full px-1.5 text-xs ${
                    active ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {byStatus.get(s.value)?.length ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="mt-3 flex flex-1 gap-6 overflow-x-auto pb-2 md:mt-0">
          {WORK_ITEM_STATUSES.map((s) => (
            <KanbanColumn
              key={s.value}
              className={s.value === activeMobileStatus ? '' : 'hidden md:flex'}
              status={s.value}
              label={s.label}
              items={byStatus.get(s.value) ?? []}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onCardClick={setSelectedItem}
              canDrag={!qa}
              showQaFlag={!qa}
            />
          ))}
        </div>
      )}

      {formModal.mode === 'create' &&
        (qa ? (
          <QaReportFormModal onClose={() => setFormModal({ mode: 'closed' })} />
        ) : (
          <WorkItemFormModal onClose={() => setFormModal({ mode: 'closed' })} />
        ))}
      {formModal.mode === 'edit' && (
        <WorkItemFormModal
          workItem={formModal.item}
          onClose={() => setFormModal({ mode: 'closed' })}
        />
      )}
      {selected && (
        <WorkItemDetailModal
          item={selected}
          onClose={() => setSelectedItem(null)}
          readOnly={qa}
          onEdit={(item) => {
            setSelectedItem(null);
            setFormModal({ mode: 'edit', item });
          }}
        />
      )}
    </div>
  );
}
