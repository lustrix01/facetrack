import { apiFetch } from './api';

export type HistoryItem = {
  id: number;
  session_id: number;
  student_id: number;
  student_number: string;
  student_name: string;
  department: string;
  class_id: number;
  class_code: string;
  class_name: string;
  section: string;
  room: string;
  timestamp: string;
  checkout_time?: string;
  status: string;
  notes?: string;
};

export type HistoryFilter = {
  date?: string;
  class_id?: number | string;
  status?: string;
};

export const historyService = {
  async getHistory(filters: HistoryFilter): Promise<HistoryItem[]> {
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.class_id && filters.class_id !== 'all') params.append('class_id', String(filters.class_id));
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);

    const query = params.toString() ? `?${params.toString()}` : '';

    try {
      const res = await apiFetch<{ status: string; data: HistoryItem[] }>(`/api/attendance/history${query}`, { method: 'GET' });
      return res.data;
    } catch {
      return [];
    }
  },

  async downloadCSV(filters: HistoryFilter): Promise<void> {
    const token = localStorage.getItem('facetrack_token') || sessionStorage.getItem('facetrack_token');
    const params = new URLSearchParams();
    if (filters.date) params.append('date', filters.date);
    if (filters.class_id && filters.class_id !== 'all') params.append('class_id', String(filters.class_id));
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    params.append('export', 'csv');
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/api/attendance/history?${params.toString()}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `facetrack_attendance_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};
