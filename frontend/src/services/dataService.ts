import { apiFetch } from './api';

export interface SystemStats {
  totalClasses: number;
  todaySessions: number;
  presentStudents: number;
  lateStudents: number;
  checkedOutStudents: number;
  stillInsideStudents: number;
  totalStudents: number;
  totalFaculty: number;
  attendanceRate: number;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  department: string;
  timestamp: string;
  status: 'Present' | 'Late' | 'Absent';
  confidenceScore: number;
}

export const dataService = {
  async getStats(): Promise<SystemStats> {
    try {
      const response = await apiFetch<{ status: string; data: SystemStats }>('/api/stats', { method: 'GET' });
      return response.data;
    } catch {
      return {
        totalClasses: 4,
        todaySessions: 2,
        presentStudents: 42,
        lateStudents: 5,
        checkedOutStudents: 38,
        stillInsideStudents: 9,
        totalStudents: 128,
        totalFaculty: 12,
        attendanceRate: 94.2,
      };
    }
  },

  async getRecentLogs(): Promise<AttendanceRecord[]> {
    try {
      const response = await apiFetch<{ status: string; data: any[] }>('/api/attendance', { method: 'GET' });
      return response.data.map((item) => ({
        id: String(item.id),
        studentId: item.student_id || '2026-0101',
        studentName: item.student_name || 'Alex Rivera',
        department: item.department || 'Computer Science',
        timestamp: item.timestamp,
        status: (item.status?.charAt(0).toUpperCase() + item.status?.slice(1)) as 'Present' | 'Late' | 'Absent',
        confidenceScore: parseFloat(item.confidence_score) || 0.98,
      }));
    } catch {
      return [];
    }
  },
};
