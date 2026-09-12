import { apiClient } from './api-client';
import type { WorkItemComment } from '../types/comment';

export async function fetchComments(workItemId: string): Promise<WorkItemComment[]> {
  const { data } = await apiClient.get<WorkItemComment[]>('/comments', {
    params: { workItemId },
  });
  return data;
}

export async function createComment(
  workItemId: string,
  text: string,
  dueDate?: string,
): Promise<WorkItemComment> {
  const { data } = await apiClient.post<WorkItemComment>('/comments', {
    workItemId,
    text,
    dueDate: dueDate || undefined,
  });
  return data;
}

export async function updateComment(
  id: string,
  payload: { dueDate?: string | null; resolved?: boolean },
): Promise<WorkItemComment> {
  const { data } = await apiClient.patch<WorkItemComment>(`/comments/${id}`, payload);
  return data;
}
