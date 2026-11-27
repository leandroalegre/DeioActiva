import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchMeeting, updateMeeting } from '../lib/meetings-api';
import { getApiErrorMessage } from '../lib/api-client';
import { useAuth } from '../app/auth/AuthContext';
import { canManageMeeting } from '../config/roles';
import { DictadoBoton, sumarDictado } from '../components/ui/DictadoBoton';
import {
  MEETING_STATUSES,
  POINT_STATUSES,
  POINT_TYPES,
  formatDay,
  frequencyLabel,
  metaOf,
} from '../types/meeting';
import type { Meeting, MeetingPoint } from '../types/meeting';

type Draft = { notes: string; topics: string; decisions: string };

const lineas = (t?: string | null) =>
  (t ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, '').trim())
    .filter(Boolean);

const normal = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

// "Titulo: resolucion (responsable: X, control 20 nov 2026)", igual que en DNT y Gestion Activa.
function decisionDePunto(p: MeetingPoint) {
  const extra = [
    p.responsible ? `responsable: ${p.responsible.fullName}` : null,
    p.dueDate ? `control ${formatDay(p.dueDate)}` : null,
  ].filter(Boolean);
  return `${p.title}: ${p.resolution}${extra.length ? ` (${extra.join(', ')})` : ''}`;
}

function draftDe(m: Meeting): Draft {
  return {
    notes: m.minutesNotes ?? '',
    topics: m.minutesTopics ?? '',
    decisions: m.minutesDecisions ?? '',
  };
}

const AREA =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

// Acta de la reunion en formato imprimible (Ctrl+P / "Guardar como PDF"). Se arma con los
// datos actuales de la reunion: participantes y asistencia, cada punto con su resolucion,
// responsable y fecha de control. Ademas es editable ("Editar acta"): observaciones, otros
// temas tratados y decisiones, con "Traer del orden del dia" para partir de lo que ya dice.
// Mientras se edita, el acta de abajo funciona como vista previa.
export function ActaReunionPage() {
  const { id = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: meeting, isLoading, isError } = useQuery({
    queryKey: ['meeting', id],
    queryFn: () => fetchMeeting(id),
    enabled: Boolean(id),
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [opened, setOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const canEdit = canManageMeeting(user, meeting);
  // "?editar=1" (desde la reunion) abre el editor directamente, una sola vez.
  if (meeting && canEdit && !opened && searchParams.get('editar') === '1') {
    setOpened(true);
    setDraft(draftDe(meeting));
  }

  const save = useMutation({
    mutationFn: (d: Draft) =>
      updateMeeting(id, {
        minutesNotes: d.notes.trim() || null,
        minutesTopics: lineas(d.topics).join('\n') || null,
        minutesDecisions: lineas(d.decisions).join('\n') || null,
      }),
    onSuccess: (m) => {
      queryClient.setQueryData(['meeting', id], m);
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      setDraft(null);
      setSaved(true);
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo guardar el acta.')),
  });

  if (isLoading) return <p className="p-8 text-sm text-slate-500">Cargando acta...</p>;
  if (isError || !meeting) return <p className="p-8 text-sm text-red-600">No se encontró la reunión.</p>;

  // Lo que se muestra: el borrador mientras se edita (vista previa), si no lo guardado.
  const view: Draft = draft ?? draftDe(meeting);
  const titulos = new Set(meeting.points.map((p) => normal(p.title)));
  const otrosTemas = lineas(view.topics).filter((t) => !titulos.has(normal(t)));
  const decisionesEditadas = lineas(view.decisions);

  function traerDeOrdenDelDia() {
    if (!draft || !meeting) return;
    const pisa = draft.topics.trim() || draft.decisions.trim();
    if (pisa && !window.confirm('Se reemplazan Temas y Decisiones con lo del orden del día. ¿Seguir?')) {
      return;
    }
    setDraft({
      ...draft,
      topics: meeting.points.map((p) => p.title).join('\n'),
      decisions: meeting.points
        .filter((p) => p.resolution?.trim())
        .map(decisionDePunto)
        .join('\n'),
    });
  }

  const dictarEn = (campo: keyof Draft, sep: string) => (t: string) =>
    setDraft((d) => (d ? { ...d, [campo]: sumarDictado(d[campo], t, sep) } : d));

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
        <div className="flex gap-2">
          {canEdit && !draft && (
            <button
              onClick={() => {
                setSaved(false);
                setError(null);
                setDraft(draftDe(meeting));
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Editar acta
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
          >
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {saved && !draft && (
        <p className="mx-auto mb-4 max-w-3xl rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700 print:hidden">
          Acta guardada.
        </p>
      )}

      {draft && (
        <section className="mx-auto mb-4 max-w-3xl rounded-xl border border-brand-200 bg-white p-5 shadow-sm print:hidden">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Editar acta</h2>
              <p className="text-xs text-slate-500">
                Uno por línea. El acta de abajo es la vista previa y se actualiza mientras escribís.
              </p>
            </div>
            <button
              onClick={traerDeOrdenDelDia}
              title="Llena Temas y Decisiones con los puntos y lo resuelto; después podés editarlos"
              className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-100"
            >
              Traer del orden del día
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">Observaciones</label>
                <DictadoBoton etiqueta="Dictar" onTexto={dictarEn('notes', ' ')} />
              </div>
              <textarea
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className={AREA}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Temas tratados{' '}
                  <span className="font-normal text-slate-400">
                    (los que no son puntos del orden del día se suman como “Otros temas”)
                  </span>
                </label>
                <DictadoBoton etiqueta="Dictar" onTexto={dictarEn('topics', '\n')} />
              </div>
              <textarea
                rows={4}
                value={draft.topics}
                onChange={(e) => setDraft({ ...draft, topics: e.target.value })}
                className={AREA}
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Decisiones{' '}
                  <span className="font-normal text-slate-400">
                    (si queda vacío, se listan los puntos tipo Decisión)
                  </span>
                </label>
                <DictadoBoton etiqueta="Dictar" onTexto={dictarEn('decisions', '\n')} />
              </div>
              <textarea
                rows={4}
                value={draft.decisions}
                onChange={(e) => setDraft({ ...draft, decisions: e.target.value })}
                className={AREA}
              />
            </div>
          </div>

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={() => {
                setDraft(null);
                setError(null);
              }}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setError(null);
                save.mutate(draft);
              }}
              disabled={save.isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
            >
              {save.isPending ? 'Guardando...' : 'Guardar acta'}
            </button>
          </div>
        </section>
      )}

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

        {otrosTemas.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              Otros temas tratados
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {otrosTemas.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        )}

        {decisionesEditadas.length > 0 ? (
          <section className="mt-6">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">Decisiones</h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {decisionesEditadas.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>
        ) : (
          decisions.length > 0 && (
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
          )
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
            {view.notes.trim() || <span className="italic text-slate-400">Sin observaciones.</span>}
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
