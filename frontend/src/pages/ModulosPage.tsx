import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchModuleTree } from '../lib/modules-api';
import { ModuleFormModal } from '../components/modules/ModuleFormModal';
import { useAuth } from '../app/auth/AuthContext';
import type { ModuleTreeNode } from '../types/work-item';

const ADMIN_ROLES = ['super_admin', 'admin'];

function ModuleNode({
  node,
  depth,
  canEdit,
  onEdit,
  onAddChild,
}: {
  node: ModuleTreeNode;
  depth: number;
  canEdit: boolean;
  onEdit: (m: ModuleTreeNode) => void;
  onAddChild: (parentId: string) => void;
}) {
  return (
    <div>
      <div
        className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 hover:bg-slate-50"
        style={{ paddingLeft: `${12 + depth * 24}px` }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-sm font-medium ${node.active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
            {node.name}
          </span>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">
            {node.slug}
          </span>
          {!node.active && (
            <span className="shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-400">
              Inactivo
            </span>
          )}
        </div>
        {canEdit && (
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => onAddChild(node.id)}
              className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              + Submódulo
            </button>
            <button
              onClick={() => onEdit(node)}
              className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
            >
              Editar
            </button>
          </div>
        )}
      </div>
      {node.children?.map((child) => (
        <ModuleNode
          key={child.id}
          node={child}
          depth={depth + 1}
          canEdit={canEdit}
          onEdit={onEdit}
          onAddChild={onAddChild}
        />
      ))}
    </div>
  );
}

export function ModulosPage() {
  const { user } = useAuth();
  const canEdit = Boolean(user && ADMIN_ROLES.includes(user.role.code));

  const { data: tree, isLoading, isError } = useQuery({
    queryKey: ['modules'],
    queryFn: fetchModuleTree,
  });

  const [modalState, setModalState] = useState<
    { mode: 'closed' } | { mode: 'create'; parentId?: string } | { mode: 'edit'; module: ModuleTreeNode }
  >({ mode: 'closed' });

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Módulos</h1>
          <p className="text-sm text-slate-500">
            Estructura de módulos y submódulos del producto. Las tareas se agrupan por módulo.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setModalState({ mode: 'create' })}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
          >
            + Nuevo módulo
          </button>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando módulos...</p>}
      {isError && (
        <p className="text-sm text-red-600">
          No se pudieron cargar los módulos. Revisá que el backend esté corriendo.
        </p>
      )}

      {!isLoading && !isError && (
        <div className="rounded-xl border border-slate-200 bg-white p-2">
          {(tree ?? []).length === 0 && (
            <p className="px-3 py-4 text-sm text-slate-400">
              Todavía no hay módulos creados{canEdit ? '. Empezá creando el primero.' : '.'}
            </p>
          )}
          {(tree ?? []).map((node) => (
            <ModuleNode
              key={node.id}
              node={node}
              depth={0}
              canEdit={canEdit}
              onEdit={(m) => setModalState({ mode: 'edit', module: m })}
              onAddChild={(parentId) => setModalState({ mode: 'create', parentId })}
            />
          ))}
        </div>
      )}

      {modalState.mode === 'create' && (
        <ModuleFormModal
          defaultParentId={modalState.parentId}
          onClose={() => setModalState({ mode: 'closed' })}
        />
      )}
      {modalState.mode === 'edit' && (
        <ModuleFormModal
          module={modalState.module}
          onClose={() => setModalState({ mode: 'closed' })}
        />
      )}
    </div>
  );
}
