export type UserRole = 'faculty' | 'student';

export interface User {
  id: number;
  identifier: string; // Faculty ID or Student Number
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

export interface LoginCredentials {
  identifier: string;
  password: string;
  role: UserRole;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  identifier: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department?: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  status: 'success' | 'error';
  message?: string;
  token?: string;
  user?: User;
}
