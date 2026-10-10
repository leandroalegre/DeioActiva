import { apiClient } from './api-client';

export interface AppNotification {
  id: string;
  workItemId?: string | null;
  text: string;
  readAt?: string | null;
  createdAt: string;
}

export async function fetchNotifications(): Promise<{
  data: AppNotification[];
  unreadCount: number;
}> {
  const { data } = await apiClient.get('/notifications');
  return data;
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.post('/notifications/read-all');
}
