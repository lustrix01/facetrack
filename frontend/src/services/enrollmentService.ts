import { apiFetch } from './api';

export type StudentUser = {
  id: number;
  student_number: string;
  name: string;
  email: string;
  department: string;
};

export type EnrolledStudent = {
  enrollment_id: number;
  class_id: number;
  student_id: number;
  enrolled_at: string;
  student_number: string;
  student_name: string;
  email: string;
  department: string;
};

export const enrollmentService = {
  async getStudents(search?: string): Promise<StudentUser[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await apiFetch<{ status: string; data: StudentUser[] }>(`/api/students${query}`, { method: 'GET' });
      return res.data;
    } catch {
      return [];
    }
  },

  async getEnrolledStudents(classId: number): Promise<EnrolledStudent[]> {
    try {
      const res = await apiFetch<{ status: string; data: EnrolledStudent[] }>(`/api/enrollments?class_id=${classId}`, {
        method: 'GET',
      });
      return res.data;
    } catch {
      return [];
    }
  },

  async enrollStudent(classId: number, studentId: number): Promise<EnrolledStudent> {
    const res = await apiFetch<{ status: string; data: EnrolledStudent }>('/api/enrollments', {
      method: 'POST',
      body: JSON.stringify({ class_id: classId, student_id: studentId }),
    });
    return res.data;
  },

  async removeStudent(enrollmentId: number): Promise<void> {
    await apiFetch<{ status: string }>('/api/enrollments', {
      method: 'DELETE',
      body: JSON.stringify({ enrollment_id: enrollmentId }),
    });
  },
};
