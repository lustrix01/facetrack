import { apiFetch } from './api';

export interface ClassItem {
  id: number;
  code: string;
  name: string;
  section: string;
  room: string;
  enrolled_count?: number;
  created_at?: string;
}

export const classService = {
  async getClasses(search?: string): Promise<ClassItem[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiFetch<{ status: string; data: ClassItem[] }>(`/api/classes${query}`, { method: 'GET' });
      return res.data;
    } catch {
      return [];
    }
  },

  async createClass(payload: { code: string; name: string; section: string; room: string }): Promise<ClassItem> {
    const res = await apiFetch<{ status: string; data: ClassItem }>('/api/classes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async updateClass(payload: { id: number; code: string; name: string; section: string; room: string }): Promise<ClassItem> {
    const res = await apiFetch<{ status: string; data: ClassItem }>('/api/classes', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async deleteClass(id: number): Promise<void> {
    await apiFetch<{ status: string }>('/api/classes', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
  },
};
