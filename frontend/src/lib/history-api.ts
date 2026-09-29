import { apiClient } from './api-client';

export interface UserActivitySummary {
  userId: string;
  fullName: string;
  email: string;
  pendingTasks: number;
  movedTasks: number;
}

export async function fetchUserActivitySummary(): Promise<UserActivitySummary[]> {
  const { data } = await apiClient.get<UserActivitySummary[]>('/history/user-activity');
  return data;
}
