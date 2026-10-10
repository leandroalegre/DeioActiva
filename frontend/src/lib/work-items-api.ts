import { apiClient } from './api-client';
import type {
  WorkItem,
  WorkItemArea,
  WorkItemAttachment,
  WorkItemChecklistItem,
  WorkItemPriority,
  WorkItemStatus,
  WorkItemType,
} from '../types/work-item';

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
  // Opcional solo para el perfil QA (sin modulo, el reporte cae en "Reportes QA").
  moduleId?: string;
  type: WorkItemType;
  area?: WorkItemArea;
  title: string;
  description?: string;
  priority?: WorkItemPriority;
  plannedStart?: string;
  plannedEnd?: string;
  dueDate?: string;
  milestoneId?: string | null;
  establishment?: string;
  suggestedPriority?: WorkItemPriority;
  // Solo al crear: despues el checklist se gestiona con los endpoints de /checklist.
  checklist?: string[];
}

export type UpdateWorkItemPayload = Partial<Omit<CreateWorkItemPayload, 'checklist'>> & {
  status?: WorkItemStatus;
};

export async function createWorkItem(payload: CreateWorkItemPayload): Promise<WorkItem> {
  const { data } = await apiClient.post<WorkItem>('/work-items', payload);
  return data;
}

export async function updateWorkItem(id: string, payload: UpdateWorkItemPayload): Promise<WorkItem> {
  const { data } = await apiClient.patch<WorkItem>(`/work-items/${id}`, payload);
  return data;
}

export async function updateWorkItemStatus(id: string, status: WorkItemStatus): Promise<WorkItem> {
  const { data } = await apiClient.patch<WorkItem>(`/work-items/${id}`, { status });
  return data;
}

export async function deleteWorkItem(id: string): Promise<void> {
  await apiClient.delete(`/work-items/${id}`);
}

// ---- Checklist de la tarea -------------------------------------------------------------

export async function addChecklistItem(workItemId: string, text: string): Promise<WorkItemChecklistItem> {
  const { data } = await apiClient.post<WorkItemChecklistItem>(
    `/work-items/${workItemId}/checklist`,
    { text },
  );
  return data;
}

export async function updateChecklistItem(
  workItemId: string,
  itemId: string,
  payload: { text?: string; done?: boolean },
): Promise<WorkItemChecklistItem> {
  const { data } = await apiClient.patch<WorkItemChecklistItem>(
    `/work-items/${workItemId}/checklist/${itemId}`,
    payload,
  );
  return data;
}

export async function deleteChecklistItem(workItemId: string, itemId: string): Promise<void> {
  await apiClient.delete(`/work-items/${workItemId}/checklist/${itemId}`);
}

// ---- Imagenes adjuntas -----------------------------------------------------------------

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = 'image/png,image/jpeg,image/gif,image/webp';

export async function uploadWorkItemImage(workItemId: string, file: File): Promise<WorkItemAttachment> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<WorkItemAttachment>(
    `/work-items/${workItemId}/attachments`,
    form,
  );
  return data;
}

// La imagen se pide con el token (axios) y se convierte en un object URL: un <img src> directo
// a la API no manda el header Authorization.
export async function fetchWorkItemImageBlob(workItemId: string, attachmentId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(
    `/work-items/${workItemId}/attachments/${attachmentId}`,
    { responseType: 'blob' },
  );
  return data;
}

export async function deleteWorkItemImage(workItemId: string, attachmentId: string): Promise<void> {
  await apiClient.delete(`/work-items/${workItemId}/attachments/${attachmentId}`);
}
