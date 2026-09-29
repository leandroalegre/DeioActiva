import { useQuery } from '@tanstack/react-query';
import { fetchWorkItems } from '../lib/work-items-api';
import { fetchUserActivitySummary } from '../lib/history-api';
import type { WorkItemStatus } from '../types/work-item';

// Fase 1 sin endpoint de metricas dedicado: se reusa el mismo fetch de tareas que ya usan
// Kanban/Gantt (hasta 100 tareas, ver fetchWorkItems) y se cuenta client-side por estado.
// Valido mientras el volumen de tareas sea chico; el dia que se sume paginacion real esto
// pasa a un endpoint /work-items/stats en el backend.
const CARDS: { label: string; status: WorkItemStatus; color: string }[] = [
  { label: 'Pendientes', status: 'PENDING', color: 'bg-slate-100 text-slate-700' },
  { label: 'En desarrollo', status: 'DEVELOPMENT', color: 'bg-blue-50 text-blue-700' },
  { label: 'En pruebas', status: 'TESTING', color: 'bg-amber-50 text-amber-700' },
  { label: 'Bloqueadas', status: 'BLOCKED', color: 'bg-red-50 text-red-700' },
  { label: 'Finalizadas', status: 'COMPLETED', color: 'bg-emerald-50 text-emerald-700' },
];

export function DashboardPage() {
  const { data: items, isLoading, isError } = useQuery({
    queryKey: ['work-items'],
    queryFn: fetchWorkItems,
  });

  const {
    data: activity,
    isLoading: isActivityLoading,
    isError: isActivityError,
  } = useQuery({
    queryKey: ['user-activity'],
    queryFn: fetchUserActivitySummary,
  });

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Dashboard</h1>

      {isError && (
        <p className="mb-4 text-sm text-red-600">
          No se pudo cargar la información. Revisá que el backend esté corriendo.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CARDS.map((card) => {
          const value = items?.filter((i) => i.status === card.status).length;
          return (
            <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p
                className={`mt-3 inline-flex rounded-lg px-3 py-1 text-2xl font-semibold ${card.color}`}
              >
                {isLoading || isError ? '—' : value}
              </p>
            </div>
          );
        })}
      </div>

      {!isLoading && !isError && items && (
        <p className="mt-4 text-sm text-slate-400">{items.length} tareas en total.</p>
      )}

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Actividad por usuario</h2>

        {isActivityError && (
          <p className="mb-4 text-sm text-red-600">
            No se pudo cargar la actividad de usuarios.
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Usuario</th>
                <th className="px-4 py-3 font-medium">Tareas pendientes</th>
                <th className="px-4 py-3 font-medium">Tareas movidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isActivityLoading && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                    Cargando actividad...
                  </td>
                </tr>
              )}
              {!isActivityLoading &&
                (activity ?? []).map((row) => (
                  <tr key={row.userId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{row.fullName}</td>
                    <td className="px-4 py-3 text-slate-600">{row.pendingTasks}</td>
                    <td className="px-4 py-3 text-slate-600">{row.movedTasks}</td>
                  </tr>
                ))}
              {!isActivityLoading && !isActivityError && (activity ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-400">
                    No hay actividad registrada todavia.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
