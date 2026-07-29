const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token =
    localStorage.getItem('facetrack_token') ||
    sessionStorage.getItem('facetrack_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (response.status === 401) {
    // Purge stale expired token if 401 unauthorized occurs
    localStorage.removeItem('facetrack_token');
    localStorage.removeItem('facetrack_user');
    sessionStorage.removeItem('facetrack_token');
    sessionStorage.removeItem('facetrack_user');
    
    throw new Error(data.message || 'Session expired. Please sign in again.');
  }

  if (!response.ok) {
    throw new Error(data.message || 'An API error occurred.');
  }

  return data as T;
}
