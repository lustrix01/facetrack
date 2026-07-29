import { apiFetch } from './api';

export type SessionItem = {
  id: number;
  class_id: number;
  class_code: string;
  class_name: string;
  section: string;
  room: string;
  title: string;
  session_date: string;
  start_time: string;
  end_time?: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  status: 'active' | 'ended' | 'completed' | 'cancelled';
};

export const sessionService = {
  async getSessions(): Promise<SessionItem[]> {
    try {
      const res = await apiFetch<{ status: string; data: SessionItem[] }>('/api/sessions', { method: 'GET' });
      return res.data;
    } catch {
      return [];
    }
  },

  async startSession(payload: {
    class_id: number;
    start_time?: string;
    end_time?: string;
    latitude: number;
    longitude: number;
    radius_meters: number;
  }): Promise<SessionItem> {
    const res = await apiFetch<{ status: string; data: SessionItem }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        ...payload,
        start_time: payload.start_time || new Date().toISOString().slice(0, 19).replace('T', ' '),
      }),
    });
    return res.data;
  },

  async endSession(id: number): Promise<SessionItem> {
    const res = await apiFetch<{ status: string; data: SessionItem }>('/api/sessions/end', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
    return res.data;
  },
};
