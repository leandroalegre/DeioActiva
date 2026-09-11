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
