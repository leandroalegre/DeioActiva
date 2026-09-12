import { apiClient } from './api-client';
import type { WorkItemComment } from '../types/comment';

export async function fetchComments(workItemId: string): Promise<WorkItemComment[]> {
  const { data } = await apiClient.get<WorkItemComment[]>('/comments', {
    params: { workItemId },
  });
  return data;
}

export async function createComment(workItemId: string, text: string): Promise<WorkItemComment> {
  const { data } = await apiClient.post<WorkItemComment>('/comments', { workItemId, text });
  return data;
}
