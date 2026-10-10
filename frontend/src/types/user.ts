import type { Role } from './auth';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  // Roles que se suman al principal (ej. QA para una usuaria de Reuniones).
  additionalRoles?: Role[];
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}
