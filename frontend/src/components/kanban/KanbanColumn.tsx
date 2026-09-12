import { useState } from 'react';
import type { WorkItem, WorkItemStatus } from '../../types/work-item';
import { KanbanCard } from './KanbanCard';

export function KanbanColumn({
  status,
  label,
  items,
  onDragStart,
  onDrop,
}: {
  status: WorkItemStatus;
  label: string;
  items: WorkItem[];
  onDragStart: (e: React.DragEvent, item: WorkItem) => void;
  onDrop: (status: WorkItemStatus) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => {
        setIsOver(false);
        onDrop(status);
      }}
      className={`flex w-[380px] shrink-0 flex-col rounded-xl border bg-slate-100/60 p-3 transition-colors ${
        isOver ? 'border-brand-400 bg-brand-50' : 'border-slate-200'
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm">
          {items.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto">
        {items.map((item) => (
          <KanbanCard key={item.id} item={item} onDragStart={onDragStart} />
        ))}
        {items.length === 0 && (
          <p className="px-1 text-xs text-slate-400">Sin tareas</p>
        )}
      </div>
    </div>
  );
}
