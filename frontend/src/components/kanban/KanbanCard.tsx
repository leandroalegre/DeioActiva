import type { WorkItem } from '../../types/work-item';
import { WORK_ITEM_PRIORITIES, WORK_ITEM_TYPES } from '../../types/work-item';

// Una tarea se considera vencida si tiene fecha limite, esa fecha ya paso, y todavia no
// esta completada/descartada -- se usa para marcar la tarjeta con una bandera visual y que
// el PM no tenga que abrir cada tarea para notar que se paso de fecha.
function isOverdue(item: WorkItem): boolean {
  if (!item.dueDate) return false;
  if (item.status === 'COMPLETED' || item.status === 'DISCARDED') return false;
  return new Date(item.dueDate) < new Date();
}

export function KanbanCard({
  item,
  onDragStart,
  onClick,
}: {
  item: WorkItem;
  onDragStart: (e: React.DragEvent, item: WorkItem) => void;
  onClick: (item: WorkItem) => void;
}) {
  const priority = WORK_ITEM_PRIORITIES.find((p) => p.value === item.priority);
  const type = WORK_ITEM_TYPES.find((t) => t.value === item.type);
  const commentCount = item._count?.comments ?? 0;
  const overdue = isOverdue(item);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      onClick={() => onClick(item)}
      className={`cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing ${
        overdue ? 'border-red-300 border-l-4 border-l-red-500' : 'border-slate-200'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
          {type?.label ?? item.type}
        </span>
        <div className="flex items-center gap-1">
          {overdue && (
            <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-600">
              🚩 Vencida
            </span>
          )}
          {priority && (
            <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${priority.color}`}>
              {priority.label}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm font-medium leading-snug text-slate-800">{item.title}</p>
      <p className="mt-1 text-xs text-slate-500">{item.module?.name}</p>
      {item.assignedTo && (
        <p className="mt-2 text-xs text-slate-500">👤 {item.assignedTo.fullName}</p>
      )}
      {item.blocked && (
        <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">
          Bloqueada{item.blockReason ? `: ${item.blockReason}` : ''}
        </p>
      )}
      {commentCount > 0 && (
        <p className="mt-2 text-xs text-slate-400">💬 {commentCount}</p>
      )}
    </div>
  );
}
