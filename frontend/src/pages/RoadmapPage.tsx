import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMilestones } from '../lib/milestones-api';
import { MilestoneFormModal } from '../components/milestones/MilestoneFormModal';
import { MILESTONE_STATUSES } from '../types/milestone';
import { useAuth } from '../app/auth/AuthContext';
import type { Milestone } from '../types/milestone';

const ADMIN_ROLES = ['super_admin', 'admin'];

function statusMeta(status: Milestone['status']) {
  return MILESTONE_STATUSES.find((s) => s.value === status) ?? MILESTONE_STATUSES[0];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function RoadmapPage() {
  const { user } = useAuth();
  const canEdit = Boolean(user && ADMIN_ROLES.includes(user.role.code));

  const { data: milestones, isLoading, isError } = useQuery({
    queryKey: ['milestones'],
    queryFn: fetchMilestones,
  });

  const [modalState, setModalState] = useState<
    { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; milestone: Milestone }
  >({ mode: 'closed' });

  const today = new Date();

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Roadmap</h1>
          <p className="text-sm text-slate-500">Hitos del producto, ordenados por fecha límite.</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setModalState({ mode: 'create' })}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Nuevo hito
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando hitos...</p>}
      {isError && (
        <p className="text-sm text-red-600">
          No se pudieron cargar los hitos. Revisá que el backend esté corriendo.
        </p>
      )}

      {!isLoading && !isError && (milestones ?? []).length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-400">
            Todavía no hay hitos cargados{canEdit ? '. Empezá creando el primero.' : '.'}
          </p>
        </div>
      )}

      {!isLoading && !isError && (milestones ?? []).length > 0 && (
        <ol className="relative space-y-1 border-l-2 border-slate-200 pl-6">
          {(milestones ?? []).map((m) => {
            const meta = statusMeta(m.status);
            const overdue = m.status !== 'COMPLETED' && new Date(m.dueDate) < today;
            return (
              <li key={m.id} className="relative pb-4">
                <span
                  className={`absolute -left-[29px] top-1.5 h-3 w-3 rounded-full border-2 border-white ${
                    m.status === 'COMPLETED' ? 'bg-green-500' : overdue ? 'bg-red-500' : 'bg-brand-500'
                  }`}
                />
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-800">{m.name}</p>
                      <p className="text-sm text-slate-500">
                        {formatDate(m.dueDate)}
                        {overdue ? ' · vencido' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                      {canEdit && (
                        <button
                          onClick={() => setModalState({ mode: 'edit', milestone: m })}
                          className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                  {m.description && <p className="mt-2 text-sm text-slate-600">{m.description}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {modalState.mode === 'create' && (
        <MilestoneFormModal onClose={() => setModalState({ mode: 'closed' })} />
      )}
      {modalState.mode === 'edit' && (
        <MilestoneFormModal
          milestone={modalState.milestone}
          onClose={() => setModalState({ mode: 'closed' })}
        />
      )}
    </div>
  );
}
