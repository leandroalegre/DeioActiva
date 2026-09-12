import type { WorkItem } from '../../types/work-item';
import { WORK_ITEM_PRIORITIES, WORK_ITEM_TYPES } from '../../types/work-item';

export function KanbanCard({
  item,
  onDragStart,
}: {
  item: WorkItem;
  onDragStart: (e: React.DragEvent, item: WorkItem) => void;
}) {
  const priority = WORK_ITEM_PRIORITIES.find((p) => p.value === item.priority);
  const type = WORK_ITEM_TYPES.find((t) => t.value === item.type);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      className="cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
          {type?.label ?? item.type}
        </span>
        {priority && (
          <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${priority.color}`}>
            {priority.label}
          </span>
        )}
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
    </div>
  );
}
