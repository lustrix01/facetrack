import { apiFetch } from './api';

export type ActiveSessionData = {
  has_active_session: boolean;
  result_code?: string;
  message?: string;
  data?: {
    session: {
      session_id: number;
      class_id: number;
      class_code: string;
      class_name: string;
      section: string;
      room: string;
      title: string;
      start_time: string;
      end_time?: string;
      latitude: number;
      longitude: number;
      radius_meters: number;
    };
    user_attendance: {
      id: number;
      status: string;
      timestamp: string;
      checkout_time?: string;
      duration_minutes?: number;
      latitude?: number;
      longitude?: number;
      notes?: string;
    } | null;
  };
};

export type AttendanceRecord = {
  id: number;
  session_id: number;
  student_id: number;
  status: string;
  timestamp: string;
  checkout_time?: string;
  duration_minutes?: number;
  duration_formatted?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
};

export type StudentTodayStatus = {
  has_today_attendance: boolean;
  message?: string;
  data?: {
    class_code: string;
    class_name: string;
    room: string;
    checkin_time: string;
    checkout_time?: string | null;
    duration_minutes: number;
    duration_formatted: string;
    status: string;
    live_status: 'Checked Out' | 'Still Inside' | 'Not Checked In';
  };
};

export type CheckinResponse = {
  status: string;
  result_code: 'Present' | 'Late' | 'Absent' | 'Outside Allowed Area' | 'Face Not Recognized' | 'Smile Not Detected' | 'Attendance Closed' | 'Already Checked In';
  message: string;
  data?: AttendanceRecord;
};

export const attendanceService = {
  async getActiveSession(classId?: number): Promise<ActiveSessionData> {
    try {
      const query = classId ? `?class_id=${classId}` : '';
      const res = await apiFetch<ActiveSessionData>(`/api/attendance/active-session${query}`, { method: 'GET' });
      return res;
    } catch (err: any) {
      return {
        has_active_session: false,
        result_code: 'Attendance Closed',
        message: err.message || 'No active session found.',
      };
    }
  },

  async checkin(payload: {
    session_id: number;
    class_id: number;
    latitude: number;
    longitude: number;
    smile_verified: boolean;
    live_descriptor?: number[];
    image_snapshot?: string;
    image?: string;
  }): Promise<CheckinResponse> {
    const res = await apiFetch<CheckinResponse>('/api/attendance/checkin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res;
  },

  async checkout(sessionId: number): Promise<AttendanceRecord> {
    const res = await apiFetch<{ status: string; data: AttendanceRecord }>('/api/attendance/checkout', {
      method: 'POST',
      body: JSON.stringify({ session_id: sessionId }),
    });
    return res.data;
  },

  async getTodayStatus(): Promise<StudentTodayStatus> {
    try {
      const res = await apiFetch<StudentTodayStatus>('/api/attendance/today-status', { method: 'GET' });
      return res;
    } catch {
      return { has_today_attendance: false };
    }
  },
};
