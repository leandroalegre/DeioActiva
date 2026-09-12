import { apiClient } from './api-client';
import type { Milestone, MilestoneStatus } from '../types/milestone';
import type { PaginatedResult } from './work-items-api';

export async function fetchMilestones(): Promise<Milestone[]> {
  const { data } = await apiClient.get<PaginatedResult<Milestone>>('/milestones', {
    params: { pageSize: 100 },
  });
  return data.data.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export interface MilestonePayload {
  name: string;
  description?: string;
  dueDate: string;
  status?: MilestoneStatus;
}

export async function createMilestone(payload: MilestonePayload): Promise<Milestone> {
  const { data } = await apiClient.post<Milestone>('/milestones', payload);
  return data;
}

export async function updateMilestone(
  id: string,
  payload: Partial<MilestonePayload>,
): Promise<Milestone> {
  const { data } = await apiClient.patch<Milestone>(`/milestones/${id}`, payload);
  return data;
}
