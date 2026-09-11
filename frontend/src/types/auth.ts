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
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUser;
}
