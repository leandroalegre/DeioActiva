import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkItems } from '../lib/work-items-api';
import { WORK_ITEM_STATUSES } from '../types/work-item';
import type { WorkItem, WorkItemStatus } from '../types/work-item';

// Gantt casero, sin libreria externa: cada WorkItem con plannedStart/plannedEnd se dibuja
// como una barra horizontal posicionada por porcentaje dentro del rango de fechas visible.
// No maneja dependencias entre tareas (el modelo actual no las tiene) — es una linea de
// tiempo simple agrupada por modulo.

const STATUS_COLOR: Record<WorkItemStatus, string> = {
  PENDING: 'bg-slate-400',
  ANALYSIS: 'bg-purple-400',
  PLANNED: 'bg-indigo-400',
  DEVELOPMENT: 'bg-blue-500',
  TESTING: 'bg-amber-500',
  BLOCKED: 'bg-red-500',
  COMPLETED: 'bg-green-500',
  DISCARDED: 'bg-slate-300',
};

const DAY_MS = 24 * 60 * 60 * 1000;

// plannedStart/plannedEnd llegan como "solo fecha" guardados a medianoche UTC. Si se leen con
// los getters/setters locales (getFullYear/getMonth/getDate), en timezones negativos (ej.
// Argentina, UTC-3) el dia queda corrido uno para atras. Por eso todo el manejo de fechas de
// este archivo trabaja en UTC de punta a punta.
function startOfDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function monthLabel(d: Date) {
  return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit', timeZone: 'UTC' });
}

export function GanttPage() {
  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['work-items'],
    queryFn: fetchWorkItems,
  });

  const scheduled = useMemo(
    () => (items ?? []).filter((i): i is WorkItem & { plannedStart: string; plannedEnd: string } =>
      Boolean(i.plannedStart && i.plannedEnd),
    ),
    [items],
  );

  const range = useMemo(() => {
    if (scheduled.length === 0) return null;
    const starts = scheduled.map((i) => startOfDay(new Date(i.plannedStart)).getTime());
    const ends = scheduled.map((i) => startOfDay(new Date(i.plannedEnd)).getTime());
    const today = startOfDay(new Date()).getTime();
    const min = Math.min(...starts, today);
    const max = Math.max(...ends, today);
    // Un poco de margen a cada lado para que las barras de los extremos no queden pegadas.
    const padded = { start: min - 3 * DAY_MS, end: max + 3 * DAY_MS };
    const totalDays = Math.max(1, Math.round((padded.end - padded.start) / DAY_MS));
    return { ...padded, totalDays, todayOffset: ((today - padded.start) / DAY_MS / totalDays) * 100 };
  }, [scheduled]);

  const byModule = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const item of scheduled) {
      const key = item.module?.name ?? 'Sin módulo';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [scheduled]);

  const months = useMemo(() => {
    if (!range) return [];
    const result: { label: string; offset: number }[] = [];
    const cursor = new Date(range.start);
    cursor.setUTCDate(1);
    while (cursor.getTime() < range.end) {
      const offset = ((cursor.getTime() - range.start) / DAY_MS / range.totalDays) * 100;
      if (offset >= 0) result.push({ label: monthLabel(cursor), offset });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
    return result;
  }, [range]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-slate-800">Gantt</h1>
        <p className="text-sm text-slate-500">
          Línea de tiempo de tareas con fecha de inicio y fin planificadas, agrupadas por módulo.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}
      {isError && (
        <p className="text-sm text-red-600">
          No se pudo cargar la información. Revisá que el backend esté corriendo.
        </p>
      )}

      {!isLoading && !isError && scheduled.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-400">
            Todavía no hay tareas con fecha de inicio y fin planificadas para mostrar en la línea
            de tiempo. Esos campos se cargan al crear o editar una tarea (por ahora, vía la API).
          </p>
        </div>
      )}

      {!isLoading && !isError && range && scheduled.length > 0 && (
        <div className="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-4">
          <div className="min-w-[720px]">
            <div className="relative mb-2 h-6 border-b border-slate-200">
              {months.map((m, idx) => (
                <span
                  key={idx}
                  className="absolute top-0 -translate-x-1/2 text-xs font-medium text-slate-400"
                  style={{ left: `${m.offset}%` }}
                >
                  {m.label}
                </span>
              ))}
            </div>
            <div className="relative">
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-brand-500"
                style={{ left: `${range.todayOffset}%` }}
                title="Hoy"
              />
              {byModule.map(([moduleName, moduleItems]) => (
                <div key={moduleName} className="mb-4">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {moduleName}
                  </p>
                  <div className="space-y-1.5">
                    {moduleItems.map((item) => {
                      const start = startOfDay(new Date(item.plannedStart!)).getTime();
                      const end = startOfDay(new Date(item.plannedEnd!)).getTime();
                      const left = ((start - range.start) / DAY_MS / range.totalDays) * 100;
                      const width = Math.max(
                        1,
                        ((end - start) / DAY_MS / range.totalDays) * 100,
                      );
                      const statusMeta = WORK_ITEM_STATUSES.find((s) => s.value === item.status);
                      const label = `${item.title} (${statusMeta?.label ?? item.status})`;
                      const narrow = width < 6;
                      return (
                        <div key={item.id} className="relative h-7">
                          <div
                            className={`absolute h-7 rounded-md ${STATUS_COLOR[item.status]} shadow-sm ${
                              narrow ? '' : 'flex items-center overflow-hidden px-2'
                            }`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                            title={label}
                          >
                            {!narrow && (
                              <span className="truncate text-xs font-medium text-white">
                                {item.title}
                              </span>
                            )}
                          </div>
                          {narrow && (
                            <span
                              className="absolute top-0 flex h-7 items-center whitespace-nowrap pl-1 text-xs font-medium text-slate-700"
                              style={{ left: `calc(${left}% + ${width}%)` }}
                              title={label}
                            >
                              {item.title}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
