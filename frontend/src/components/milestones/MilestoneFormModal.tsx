import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMilestone, deleteMilestone, updateMilestone } from '../../lib/milestones-api';
import { getApiErrorMessage } from '../../lib/api-client';
import { MILESTONE_STATUSES } from '../../types/milestone';
import type { Milestone, MilestoneStatus } from '../../types/milestone';

export function MilestoneFormModal({
  milestone,
  onClose,
}: {
  milestone?: Milestone;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isEditing = Boolean(milestone);

  const [name, setName] = useState(milestone?.name ?? '');
  const [description, setDescription] = useState(milestone?.description ?? '');
  const [dueDate, setDueDate] = useState(milestone?.dueDate?.slice(0, 10) ?? '');
  const [status, setStatus] = useState<MilestoneStatus>(milestone?.status ?? 'PENDING');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, description: description || undefined, dueDate, status };
      return isEditing ? updateMilestone(milestone!.id, payload) : createMilestone(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      onClose();
    },
    onError: () => setError('No se pudo guardar el hito. Revisá los datos e intentá de nuevo.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMilestone(milestone!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['milestones'] });
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo eliminar el hito. Intentá de nuevo.')),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !dueDate) {
      setError('Nombre y fecha límite son obligatorios.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          {isEditing ? 'Editar hito' : 'Nuevo hito'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fecha límite</label>
            <input
              required
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {MILESTONE_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Descripción (opcional)
            </label>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <div>
              {isEditing && !confirmDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Eliminar hito
                </button>
              )}
              {isEditing && confirmDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">¿Eliminar? No se puede deshacer.</span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate()}
                    disabled={deleteMutation.isPending}
                    className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                  >
                    No
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60"
              >
                {mutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear hito'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
