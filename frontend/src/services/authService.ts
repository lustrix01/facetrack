import { apiFetch } from './api';
import type { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types/auth';

const TOKEN_KEY = 'facetrack_token';
const USER_KEY = 'facetrack_user';

export const authService = {
  async register(credentials: RegisterCredentials): Promise<{ user: User; token: string }> {
    const data = await apiFetch<AuthResponse>('/api/register', {
      method: 'POST',
      body: JSON.stringify({
        identifier: credentials.identifier,
        name: credentials.name,
        email: credentials.email,
        password: credentials.password,
        role: credentials.role,
        department: credentials.department || 'General',
      }),
    });

    if (data.status !== 'success' || !data.token || !data.user) {
      throw new Error(data.message || 'Registration failed.');
    }

    const storage = credentials.rememberMe ? localStorage : sessionStorage;
    
    // Clear existing tokens from both storages
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);

    storage.setItem(TOKEN_KEY, data.token);
    storage.setItem(USER_KEY, JSON.stringify(data.user));

    return { user: data.user, token: data.token };
  },

  async login(credentials: LoginCredentials): Promise<{ user: User; token: string }> {
    const data = await apiFetch<AuthResponse>('/api/login', {
      method: 'POST',
      body: JSON.stringify({
        identifier: credentials.identifier,
        password: credentials.password,
        role: credentials.role,
      }),
    });

    if (data.status !== 'success' || !data.token || !data.user) {
      throw new Error(data.message || 'Login failed.');
    }

    const storage = credentials.rememberMe ? localStorage : sessionStorage;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);

    storage.setItem(TOKEN_KEY, data.token);
    storage.setItem(USER_KEY, JSON.stringify(data.user));

    return { user: data.user, token: data.token };
  },

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
  },

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },

  getStoredUser(): User | null {
    const raw = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const data = await apiFetch<AuthResponse>('/api/me', { method: 'GET' });
      if (data.status === 'success' && data.user) {
        return data.user;
      }
      return null;
    } catch {
      return this.getStoredUser();
    }
  },
};
