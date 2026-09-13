import { apiClient } from './api-client';
import type { ModuleTreeNode } from '../types/work-item';

export async function fetchModuleTree(): Promise<ModuleTreeNode[]> {
  const { data } = await apiClient.get<ModuleTreeNode[]>('/modules');
  return data;
}

// Aplana el arbol a una lista simple, indentando el nombre segun profundidad,
// para usar en un <select> de "elegir modulo" al crear una tarea.
export function flattenModules(
  tree: ModuleTreeNode[],
  depth = 0,
): { id: string; label: string }[] {
  return tree.flatMap((node) => [
    { id: node.id, label: `${'—'.repeat(depth)} ${node.name}`.trim() },
    ...flattenModules(node.children ?? [], depth + 1),
  ]);
}

export interface ModulePayload {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  order?: number;
  active?: boolean;
}

export async function createModule(payload: ModulePayload): Promise<ModuleTreeNode> {
  const { data } = await apiClient.post<ModuleTreeNode>('/modules', payload);
  return data;
}

export async function updateModule(
  id: string,
  payload: Partial<ModulePayload>,
): Promise<ModuleTreeNode> {
  const { data } = await apiClient.patch<ModuleTreeNode>(`/modules/${id}`, payload);
  return data;
}

export async function deleteModule(id: string): Promise<void> {
  await apiClient.delete(`/modules/${id}`);
}
