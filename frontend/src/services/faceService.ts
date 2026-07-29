import { apiFetch } from './api';

export type FaceStatusData = {
  consent_id: number | null;
  user_id: number | null;
  agreed: boolean;
  agreed_at: string | null;
  ip_address: string | null;
  consent_given: boolean;
  consented_at: string | null;
  is_enrolled: boolean;
  enrolled_at: string | null;
  sample_count: number;
  image_path: string | null;
};

export type FacultyFaceRosterItem = {
  student_id: number;
  student_number: string;
  student_name: string;
  department: string;
  consent_agreed: boolean;
  consent_agreed_at: string | null;
  enrollment_status: 'completed' | 'pending';
  sample_count: number | null;
  enrolled_at: string | null;
};

export const faceService = {
  async getFaceStatus(): Promise<FaceStatusData> {
    try {
      const res = await apiFetch<{ status: string; data: FaceStatusData }>('/api/face/status', { method: 'GET' });
      return res.data;
    } catch {
      return {
        consent_id: null,
        user_id: null,
        agreed: false,
        agreed_at: null,
        ip_address: null,
        consent_given: false,
        consented_at: null,
        is_enrolled: false,
        enrolled_at: null,
        sample_count: 0,
        image_path: null,
      };
    }
  },

  async acceptConsent(): Promise<void> {
    await apiFetch<{ status: string }>('/api/privacy-consent', {
      method: 'POST',
      body: JSON.stringify({ agreed: true, consent_given: true }),
    });
  },

  async enrollFace(samples: string[], sampleCount: number, reEnroll: boolean = false): Promise<void> {
    await apiFetch<{ status: string }>('/api/face/enroll', {
      method: 'POST',
      body: JSON.stringify({
        samples,
        sample_count: sampleCount,
        image_snapshot: samples[0] || '',
        re_enroll: reEnroll,
      }),
    });
  },

  async getFacultyFaceRoster(): Promise<FacultyFaceRosterItem[]> {
    try {
      const res = await apiFetch<{ status: string; data: FacultyFaceRosterItem[] }>('/api/face/faculty-roster', {
        method: 'GET',
      });
      return res.data;
    } catch {
      return [];
    }
  },
};
