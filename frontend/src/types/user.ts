import type { Role } from './auth';

export interface AppUser {
  id: string;
  email: string;
  // DNI opcional, solo numeros. Permite ingresar con DNI ademas del email.
  dni?: string | null;
  fullName: string;
  role: Role;
  // Roles que se suman al principal (ej. QA para una usuaria de Reuniones).
  additionalRoles?: Role[];
  active: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}
