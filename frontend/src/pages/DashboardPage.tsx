// Skeleton funcional (Fase 1): solo las cards pedidas, sin estadisticas complejas todavia.
// Cuando haya endpoint de metricas, cada card reemplaza el "—" por el valor real via react-query.
const CARDS = [
  { label: 'Pendientes', color: 'bg-slate-100 text-slate-700' },
  { label: 'En desarrollo', color: 'bg-blue-50 text-blue-700' },
  { label: 'En pruebas', color: 'bg-amber-50 text-amber-700' },
  { label: 'Bloqueadas', color: 'bg-red-50 text-red-700' },
  { label: 'Finalizadas', color: 'bg-emerald-50 text-emerald-700' },
];

export function DashboardPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-slate-800">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {CARDS.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <p className={`mt-3 inline-flex rounded-lg px-3 py-1 text-2xl font-semibold ${card.color}`}>
              —
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
