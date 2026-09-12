import { apiClient } from './api-client';
import type { AppUser } from '../types/user';
import type { PaginatedResult } from './work-items-api';

export async function fetchUsers(): Promise<AppUser[]> {
  const { data } = await apiClient.get<PaginatedResult<AppUser>>('/users', {
    params: { pageSize: 100 },
  });
  return data.data;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  roleId: string;
  active?: boolean;
}

export async function createUser(payload: CreateUserPayload): Promise<AppUser> {
  const { data } = await apiClient.post<AppUser>('/users', payload);
  return data;
}

export interface UpdateUserPayload {
  email?: string;
  fullName?: string;
  roleId?: string;
  active?: boolean;
  password?: string;
}

export async function updateUser(id: string, payload: UpdateUserPayload): Promise<AppUser> {
  const { data } = await apiClient.patch<AppUser>(`/users/${id}`, payload);
  return data;
}
