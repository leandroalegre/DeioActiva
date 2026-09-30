export type WorkItemType = 'ERROR' | 'REQUIREMENT' | 'IMPROVEMENT' | 'TASK' | 'TEST' | 'ANALYSIS';

export type WorkItemStatus =
  | 'PENDING'
  | 'ANALYSIS'
  | 'PLANNED'
  | 'DEVELOPMENT'
  | 'TESTING'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'DISCARDED';

export type WorkItemPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type WorkItemArea = 'FRONTEND' | 'BACKEND' | 'FULLSTACK' | 'OTHER';

export interface WorkItemRef {
  id: string;
  name?: string;
  slug?: string;
  fullName?: string;
  email?: string;
}

export interface WorkItem {
  id: string;
  moduleId: string;
  module: { id: string; name: string; slug: string };
  type: WorkItemType;
  area: WorkItemArea;
  title: string;
  description?: string | null;
  status: WorkItemStatus;
  priority: WorkItemPriority;
  assignedToId?: string | null;
  assignedTo?: WorkItemRef | null;
  createdById: string;
  createdBy: WorkItemRef;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  dueDate?: string | null;
  actualStart?: string | null;
  actualEnd?: string | null;
  progressPercentage: number;
  blocked: boolean;
  blockReason?: string | null;
  versionTarget?: string | null;
  milestoneId?: string | null;
  milestone?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
  _count?: { comments: number };
  checklistItems?: WorkItemChecklistItem[];
  attachments?: WorkItemAttachment[];
}

export interface WorkItemChecklistItem {
  id: string;
  workItemId: string;
  text: string;
  done: boolean;
  position: number;
  doneById?: string | null;
  doneByName?: string | null;
  doneAt?: string | null;
  createdAt: string;
}

export interface WorkItemAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface ModuleTreeNode {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId: string | null;
  order: number;
  active: boolean;
  children: ModuleTreeNode[];
}

export const WORK_ITEM_STATUSES: { value: WorkItemStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'ANALYSIS', label: 'Análisis' },
  { value: 'PLANNED', label: 'Planificado en localhost' },
  { value: 'DEVELOPMENT', label: 'Desarrollo' },
  { value: 'TESTING', label: 'Testing' },
  { value: 'BLOCKED', label: 'Bloqueado' },
  { value: 'COMPLETED', label: 'Completado' },
  { value: 'DISCARDED', label: 'Descartado' },
];

export const WORK_ITEM_TYPES: { value: WorkItemType; label: string }[] = [
  { value: 'ERROR', label: 'Error' },
  { value: 'REQUIREMENT', label: 'Requerimiento' },
  { value: 'IMPROVEMENT', label: 'Mejora' },
  { value: 'TASK', label: 'Tarea' },
  { value: 'TEST', label: 'Prueba' },
  { value: 'ANALYSIS', label: 'Análisis' },
];

export const WORK_ITEM_AREAS: { value: WorkItemArea; label: string; color: string }[] = [
  { value: 'FRONTEND', label: 'Frontend', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { value: 'BACKEND', label: 'Backend', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'FULLSTACK', label: 'Fullstack', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'OTHER', label: 'Otro', color: 'bg-slate-100 text-slate-600 border-slate-200' },
];

export const WORK_ITEM_PRIORITIES: { value: WorkItemPriority; label: string; color: string }[] = [
  { value: 'CRITICAL', label: 'Crítica', color: 'bg-red-100 text-red-700 border-red-200' },
  { value: 'HIGH', label: 'Alta', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { value: 'MEDIUM', label: 'Media', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'LOW', label: 'Baja', color: 'bg-slate-100 text-slate-600 border-slate-200' },
];
