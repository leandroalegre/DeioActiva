export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold text-slate-800">{title}</h1>
      <p className="text-sm text-slate-500">
        Esta seccion se desarrolla en una fase posterior. Fase 1 solo entrega la arquitectura,
        autenticacion y layout base.
      </p>
    </div>
  );
}
