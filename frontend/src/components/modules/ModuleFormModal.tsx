import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createModule, fetchModuleTree, flattenModules, updateModule } from '../../lib/modules-api';
import type { ModuleTreeNode } from '../../types/work-item';

// Modal unico para crear o editar un modulo. Si se pasa `module`, edita; si no, crea.
// `defaultParentId` se usa cuando el usuario aprieta "+ Submódulo" sobre un nodo del árbol.
export function ModuleFormModal({
  module,
  defaultParentId,
  onClose,
}: {
  module?: ModuleTreeNode;
  defaultParentId?: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: moduleTree } = useQuery({ queryKey: ['modules'], queryFn: fetchModuleTree });
  // No se puede elegir como padre al propio modulo que se esta editando (ni a si mismo).
  const moduleOptions = flattenModules(moduleTree ?? []).filter((m) => m.id !== module?.id);

  const isEditing = Boolean(module);

  const [name, setName] = useState(module?.name ?? '');
  const [slug, setSlug] = useState(module?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [description, setDescription] = useState(module?.description ?? '');
  const [parentId, setParentId] = useState(module?.parentId ?? defaultParentId ?? '');
  const [active, setActive] = useState(module?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  function slugify(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) {
      setSlug(slugify(value));
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        slug,
        description: description || undefined,
        parentId: parentId || undefined,
        active,
      };
      return isEditing ? updateModule(module!.id, payload) : createModule(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modules'] });
      onClose();
    },
    onError: () => setError('No se pudo guardar el módulo. Revisá los datos (el slug debe ser único) e intentá de nuevo.'),
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError('Nombre y slug son obligatorios.');
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          {isEditing ? 'Editar módulo' : 'Nuevo módulo'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nombre</label>
            <input
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Slug</label>
            <input
              required
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="mi-modulo"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Módulo padre (opcional)</label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="">Sin padre (módulo raíz)</option>
              {moduleOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
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
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            Activo
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
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
              {mutation.isPending ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear módulo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
