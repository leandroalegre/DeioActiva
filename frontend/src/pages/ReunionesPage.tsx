import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchMeetings, fetchPendingPoints, fetchMeetingOptions } from '../lib/meetings-api';
import { MeetingFormModal } from '../components/meetings/MeetingFormModal';
import { useAuth } from '../app/auth/AuthContext';
import { MEETING_MANAGER_ROLES } from '../config/roles';
import {
  MEETING_STATUSES,
  POINT_STATUSES,
  POINT_TYPES,
  formatDay,
  frequencyLabel,
  isPointOverdue,
  metaOf,
  todayKey,
} from '../types/meeting';
import type { MeetingStatus } from '../types/meeting';

type Tab = 'meetings' | 'pending';
type When = 'upcoming' | 'past' | 'all';

// Seccion Reuniones: listado de reuniones (con orden del dia, resoluciones y seguimiento) y
// tablero de puntos pendientes de todas las reuniones. Inspirado en el modulo Reuniones de
// Gestion Activa (ReunionesView + TableroReunionesView).
export function ReunionesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = Boolean(user && MEETING_MANAGER_ROLES.includes(user.role.code));

  const [tab, setTab] = useState<Tab>('meetings');
  const [when, setWhen] = useState<When>('all');
  const [status, setStatus] = useState<MeetingStatus | ''>('');
  const [search, setSearch] = useState('');
  const [responsibleId, setResponsibleId] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const meetingsQuery = useQuery({
    queryKey: ['meetings', { when, status }],
    queryFn: () => fetchMeetings({ when, status: status || undefined }),
  });
  const pendingQuery = useQuery({
    queryKey: ['meeting-pending-points', responsibleId],
    queryFn: () => fetchPendingPoints(responsibleId),
  });
  const { data: options } = useQuery({
    queryKey: ['meeting-options'],
    queryFn: fetchMeetingOptions,
    enabled: tab === 'pending',
  });

  const meetings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (meetingsQuery.data ?? []).filter(
      (m) =>
        !q ||
        m.title.toLowerCase().includes(q) ||
        (m.area ?? '').toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q),
    );
  }, [meetingsQuery.data, search]);

  const pending = pendingQuery.data ?? [];
  const today = todayKey();
  const kpis = {
    total: meetingsQuery.data?.length ?? 0,
    upcoming: (meetingsQuery.data ?? []).filter(
      (m) => m.date.slice(0, 10) >= today && m.status !== 'CANCELLED' && m.status !== 'FINISHED',
    ).length,
    openPoints: pending.length,
    overdue: pending.filter(isPointOverdue).length,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Reuniones</h1>
          <p className="text-sm text-slate-500">
            Orden del día, resoluciones y seguimiento de los puntos acordados.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Nueva reunión
          </button>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Reuniones (filtro actual)', value: kpis.total },
          { label: 'Próximas', value: kpis.upcoming },
          { label: 'Puntos abiertos', value: kpis.openPoints },
          { label: 'Puntos vencidos', value: kpis.overdue, alert: kpis.overdue > 0 },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-medium text-slate-500">{k.label}</p>
            <p className={`text-2xl font-semibold ${k.alert ? 'text-red-600' : 'text-slate-800'}`}>
              {k.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {(
          [
            ['meetings', 'Reuniones'],
            ['pending', `Puntos pendientes (${pending.length})`],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === key
                ? 'border-brand-500 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'meetings' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, área o descripción..."
              className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            <select
              value={when}
              onChange={(e) => setWhen(e.target.value as When)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="all">Todas las fechas</option>
              <option value="upcoming">Próximas (desde hoy)</option>
              <option value="past">Anteriores</option>
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MeetingStatus | '')}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los estados</option>
              {MEETING_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {meetingsQuery.isLoading && <p className="text-sm text-slate-500">Cargando reuniones...</p>}
          {meetingsQuery.isError && (
            <p className="text-sm text-red-600">No se pudieron cargar las reuniones.</p>
          )}
          {!meetingsQuery.isLoading && !meetingsQuery.isError && meetings.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
              No hay reuniones con estos filtros
              {canManage ? '. Creá la primera con “+ Nueva reunión”.' : '.'}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {meetings.map((m) => {
              const st = metaOf(MEETING_STATUSES, m.status);
              const ps = m.pointsSummary;
              const pct = ps.total ? Math.round((ps.resolved / ps.total) * 100) : 0;
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(`/reuniones/${m.id}`)}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{m.title}</p>
                      {m.area && <p className="truncate text-xs text-slate-500">{m.area}</p>}
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${st.color}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-sm text-slate-600">
                    <p>
                      📅 {formatDay(m.date)}
                      {m.startTime ? ` · ${m.startTime}${m.endTime ? `–${m.endTime}` : ''}` : ''}
                    </p>
                    <p>
                      👥 {m.participants.length} participante{m.participants.length === 1 ? '' : 's'}
                      {m.frequency !== 'UNIQUE' ? ` · 🔁 ${frequencyLabel(m.frequency)}` : ''}
                    </p>
                    {m.location && <p className="truncate">📍 {m.location}</p>}
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <div className="mb-1 flex justify-between text-xs text-slate-500">
                      <span>
                        {ps.total} punto{ps.total === 1 ? '' : 's'} · {ps.resolved} resuelto
                        {ps.resolved === 1 ? '' : 's'}
                      </span>
                      {ps.overdue > 0 && (
                        <span className="font-semibold text-red-600">🚩 {ps.overdue} vencido{ps.overdue === 1 ? '' : 's'}</span>
                      )}
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-green-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {tab === 'pending' && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={responsibleId}
              onChange={(e) => setResponsibleId(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todos los responsables</option>
              {(options?.users ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName}
                </option>
              ))}
            </select>
          </div>
          {pendingQuery.isLoading && <p className="text-sm text-slate-500">Cargando puntos...</p>}
          {!pendingQuery.isLoading && pending.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-400">
              No hay puntos pendientes. 🎉
            </div>
          )}
          {pending.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Punto</th>
                    <th className="p-3">Reunión</th>
                    <th className="p-3">Responsable</th>
                    <th className="p-3">Control</th>
                    <th className="p-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pending.map((p) => {
                    const overdue = isPointOverdue(p);
                    const st = metaOf(POINT_STATUSES, p.status);
                    const ty = metaOf(POINT_TYPES, p.type);
                    return (
                      <tr key={p.id} className={overdue ? 'bg-red-50/40' : 'hover:bg-slate-50'}>
                        <td className="p-3">
                          <span className={`mr-2 rounded border px-1.5 py-0.5 text-[11px] font-semibold ${ty.color}`}>
                            {ty.label}
                          </span>
                          <span className="font-medium text-slate-800">{p.title}</span>
                          {p.resolution && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{p.resolution}</p>
                          )}
                        </td>
                        <td className="p-3">
                          <Link to={`/reuniones/${p.meeting.id}`} className="text-brand-600 hover:underline">
                            {p.meeting.title}
                          </Link>
                          <p className="text-xs text-slate-400">{formatDay(p.meeting.date)}</p>
                        </td>
                        <td className="p-3 text-slate-600">{p.responsible?.fullName ?? '—'}</td>
                        <td className={`p-3 ${overdue ? 'font-semibold text-red-600' : 'text-slate-600'}`}>
                          {p.dueDate ? formatDay(p.dueDate) : '—'}
                          {overdue && ' 🚩'}
                        </td>
                        <td className="p-3">
                          <span className={`rounded border px-2 py-0.5 text-xs font-medium ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <MeetingFormModal
          onClose={() => setShowCreate(false)}
          onSaved={(m) => navigate(`/reuniones/${m.id}`)}
        />
      )}
    </div>
  );
}
