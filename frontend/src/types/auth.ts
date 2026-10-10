export interface Role {
  id: string;
  code: string;
  name: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  // Roles que se suman al principal (ej. QA para una usuaria de Reuniones).
  additionalRoles?: Role[];
  // Codigos de todos los roles (principal + adicionales).
  roles?: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}
