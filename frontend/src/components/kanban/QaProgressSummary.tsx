import type { WorkItem, WorkItemStatus } from '../../types/work-item';

const IN_PROGRESS: WorkItemStatus[] = ['ANALYSIS', 'PLANNED', 'DEVELOPMENT', 'TESTING', 'BLOCKED'];

// Resumen de avance arriba del tablero del perfil QA: cuantas tarjetas estan sin tomar,
// en curso y resueltas, y el porcentaje resuelto (sin contar las descartadas).
export function QaProgressSummary({ items, userId }: { items: WorkItem[]; userId?: string }) {
  const count = (statuses: WorkItemStatus[]) =>
    items.filter((i) => statuses.includes(i.status)).length;
  const waiting = count(['QA_REPORT', 'PENDING']);
  const inProgress = count(IN_PROGRESS);
  const resolved = count(['COMPLETED']);
  const discarded = count(['DISCARDED']);
  const considered = items.length - discarded;
  const percent = considered > 0 ? Math.round((resolved / considered) * 100) : 0;
  const mine = userId ? items.filter((i) => i.createdById === userId).length : 0;

  const stats = [
    { label: 'Sin tomar', value: waiting, color: 'text-amber-600' },
    { label: 'En curso', value: inProgress, color: 'text-brand-600' },
    { label: 'Resueltas', value: resolved, color: 'text-emerald-600' },
  ];

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-6">
          {stats.map((s) => (
            <div key={s.label}>
              <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {items.length} tarjetas · {mine} reportadas por vos
          {discarded > 0 ? ` · ${discarded} descartadas` : ''}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-sm font-semibold text-slate-700">{percent}% resuelto</span>
      </div>
    </div>
  );
}
