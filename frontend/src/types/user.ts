import type { Role } from './auth';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  active: boolean;
  createdAt: string;
}
