import { apiClient } from './api-client';
import type { WorkItem, WorkItemPriority, WorkItemStatus, WorkItemType } from '../types/work-item';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function fetchWorkItems(): Promise<WorkItem[]> {
  // Fase 1: se pide una pagina grande para que el Kanban vea "todo".
  // Cuando el volumen de tareas crezca, esto pasa a paginar/filtrar por modulo en el server.
  const { data } = await apiClient.get<PaginatedResult<WorkItem>>('/work-items', {
    params: { pageSize: 100 },
  });
  return data.data;
}

export interface CreateWorkItemPayload {
  moduleId: string;
  type: WorkItemType;
  title: string;
  description?: string;
  priority?: WorkItemPriority;
}

export async function createWorkItem(payload: CreateWorkItemPayload): Promise<WorkItem> {
  const { data } = await apiClient.post<WorkItem>('/work-items', payload);
  return data;
}

export async function updateWorkItemStatus(id: string, status: WorkItemStatus): Promise<WorkItem> {
  const { data } = await apiClient.patch<WorkItem>(`/work-items/${id}`, { status });
  return data;
}
