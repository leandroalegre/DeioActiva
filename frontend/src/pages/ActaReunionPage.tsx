import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMeeting } from '../lib/meetings-api';
import {
  MEETING_STATUSES,
  POINT_STATUSES,
  POINT_TYPES,
  formatDay,
  frequencyLabel,
  metaOf,
} from '../types/meeting';

// Acta de la reunion en formato imprimible (Ctrl+P / "Guardar como PDF"). Se arma siempre
// con los datos actuales de la reunion: participantes y asistencia, cada punto con su
// resolucion, responsable y fecha de control, y las observaciones generales.
export function ActaReunionPage() {
  const { id = '' } = useParams();
  const { data: meeting, isLoading, isError } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => fetchMeeting(id),
    enabled: Boolean(id),
  });

  if (isLoading) return <p className="p-8 text-sm text-slate-500">Cargando acta...</p>;
  if (isError || !meeting) return <p className="p-8 text-sm text-red-600">No se encontró la reunión.</p>;

  const present = meeting.participants.filter((p) => p.attended === true);
  const absent = meeting.participants.filter((p) => p.attended === false);
  const unknown = meeting.participants.filter((p) => p.attended === null);
  const decisions = meeting.points.filter((p) => p.type === 'DECISION' && p.resolution);
  const actions = meeting.points.filter(
    (p) => p.responsible && p.status !== 'RESOLVED' && p.status !== 'CANCELLED',
  );

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-between px-4 print:hidden">
        <Link to={`/reuniones/${meeting.id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Volver a la reunión
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
        >
          Imprimir / Guardar PDF
        </button>
      </div>

      <article className="mx-auto max-w-3xl bg-white p-10 text-slate-800 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="border-b-2 border-slate-800 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            DeioActiva · Acta de reunión
          </p>
          <h1 className="mt-1 text-2xl font-bold">{meeting.title}</h1>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div>
              <dt className="inline font-semibold">Fecha: </dt>
              <dd className="inline">{formatDay(meeting.date, { weekday: 'long', month: 'long' })}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Horario: </dt>
              <dd className="inline">
                {meeting.startTime ? `${meeting.startTime}${meeting.endTime ? ` a ${meeting.endTime}` : ''}` : '—'}
              </dd>
            </div>
            {meeting.area && (
              <div>
                <dt className="inline font-semibold">Área convocante: </dt>
                <dd className="inline">{meeting.area}</dd>
              </div>
            )}
            {meeting.location && (
              <div>
                <dt className="inline font-semibold">Lugar: </dt>
                <dd className="inline">{meeting.location}</dd>
              </div>
            )}
            <div>
              <dt className="inline font-semibold">Frecuencia: </dt>
              <dd className="inline">{frequencyLabel(meeting.frequency)}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Estado: </dt>
              <dd className="inline">{metaOf(MEETING_STATUSES, meeting.status).label}</dd>
            </div>
          </dl>
          {meeting.description && <p className="mt-3 text-sm text-slate-600">{meeting.description}</p>}
        </header>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Participantes</h2>
          {meeting.participants.length === 0 ? (
            <p className="text-sm text-slate-500">Sin participantes registrados.</p>
          ) : (
            <div className="space-y-1 text-sm">
              {present.length > 0 && (
                <p>
                  <span className="font-semibold">Presentes:</span> {present.map((p) => p.name).join(', ')}
                </p>
              )}
              {absent.length > 0 && (
                <p>
                  <span className="font-semibold">Ausentes:</span> {absent.map((p) => p.name).join(', ')}
                </p>
              )}
              {unknown.length > 0 && (
                <p>
                  <span className="font-semibold">
                    {present.length || absent.length ? 'Sin registrar:' : 'Convocados:'}
                  </span>{' '}
                  {unknown.map((p) => p.name).join(', ')}
                </p>
              )}
            </div>
          )}
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
            Temas tratados y resoluciones
          </h2>
          {meeting.points.length === 0 && <p className="text-sm text-slate-500">Sin puntos cargados.</p>}
          <ol className="space-y-4">
            {meeting.points.map((p, i) => (
              <li key={p.id} className="break-inside-avoid text-sm">
                <p className="font-semibold">
                  {i + 1}. {p.title}{' '}
                  <span className="font-normal text-slate-500">
                    ({metaOf(POINT_TYPES, p.type).label} · {metaOf(POINT_STATUSES, p.status).label})
                  </span>
                </p>
                {p.description && <p className="mt-0.5 whitespace-pre-line text-slate-600">{p.description}</p>}
                <p className="mt-1 whitespace-pre-line">
                  <span className="font-semibold">Resolución: </span>
                  {p.resolution || <span className="italic text-slate-400">sin resolución registrada</span>}
                </p>
                {(p.responsible || p.dueDate) && (
                  <p className="mt-0.5 text-slate-600">
                    {p.responsible && <>Responsable: {p.responsible.fullName}</>}
                    {p.responsible && p.dueDate && ' · '}
                    {p.dueDate && <>Fecha de control: {formatDay(p.dueDate)}</>}
                  </p>
                )}
                {p.carriedTo && (
                  <p className="mt-0.5 text-slate-500">
                    Trasladado a la reunión del {formatDay(p.carriedTo.meeting.date)}.
                  </p>
                )}
              </li>
            ))}
          </ol>
        </section>

        {decisions.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Decisiones</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {decisions.map((p) => (
                <li key={p.id}>
                  <span className="font-medium">{p.title}:</span> {p.resolution}
                </li>
              ))}
            </ul>
          </section>
        )}

        {actions.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Compromisos pendientes
            </h2>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-300 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1 pr-2">Punto</th>
                  <th className="py-1 pr-2">Responsable</th>
                  <th className="py-1">Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {actions.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1 pr-2">{p.title}</td>
                    <td className="py-1 pr-2">{p.responsible?.fullName}</td>
                    <td className="py-1">{p.dueDate ? formatDay(p.dueDate) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Observaciones</h2>
          <p className="whitespace-pre-line text-sm">
            {meeting.minutesNotes || <span className="italic text-slate-400">Sin observaciones.</span>}
          </p>
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-3 text-xs text-slate-400">
          Generada el {new Date().toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })}
          {meeting.createdBy ? ` · Reunión creada por ${meeting.createdBy.fullName}` : ''}
        </footer>
      </article>
    </div>
  );
}
