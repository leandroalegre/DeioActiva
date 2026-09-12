import { apiClient } from './api-client';
import type { Role } from '../types/auth';

export async function fetchRoles(): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>('/roles');
  return data;
}
