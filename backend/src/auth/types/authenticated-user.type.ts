export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: {
    id: string;
    code: string;
    name: string;
  };
}
