import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { attendanceService, type StudentTodayStatus } from '../services/attendanceService';
import { Camera, CheckCircle2, Clock, LogOut, ShieldCheck, Calendar, BookOpen, Percent } from 'lucide-react';

export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [todayStatus, setTodayStatus] = useState<StudentTodayStatus>({ has_today_attendance: false });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    attendanceService.getTodayStatus().then((data) => {
      setTodayStatus(data);
      setIsLoading(false);
    });
  }, []);

  const data = todayStatus.data;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user?.name || 'Student'}
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
              {user?.identifier || '2026-0101'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Student Dashboard • {user?.department || 'Information Technology Department'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => (window.location.hash = '#enrollment')}>
            <ShieldCheck className="w-3.5 h-3.5 mr-1 text-blue-600" /> Face Profile
          </Button>
          <Button variant="primary" size="sm" onClick={() => (window.location.hash = '#attendance')}>
            <Camera className="w-3.5 h-3.5 mr-1" /> Verify Attendance
          </Button>
        </div>
      </div>

      {/* STUDENT SAAS STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">96.4%</h2>
            <p className="text-[11px] font-semibold text-emerald-600">Excellent Standing</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Enrolled Classes</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">4</h2>
            <p className="text-[11px] font-semibold text-blue-600">Active Semester</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Facial Enrollment</p>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Active</h2>
            <p className="text-[11px] font-semibold text-emerald-600">5/5 Samples Validated</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </Card>

        <Card className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upcoming Session</p>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">CS101 - 09:00 AM</h2>
            <p className="text-[11px] font-semibold text-slate-500">Lab 3 (Sec 1)</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* TODAY'S ATTENDANCE STATUS WIDGET */}
      <Card
        title="Today's Attendance Status"
        subtitle="Live tracking of your check-in, check-out, and class duration for today"
      >
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Checking today's attendance status...</div>
        ) : !todayStatus.has_today_attendance || !data ? (
          <div className="py-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Calendar className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-800">No Attendance Recorded Today</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                You haven't checked in for any class sessions today. Go to Check-in Attendance to capture your face and location.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => (window.location.hash = '#attendance')}>
              <Camera className="w-3.5 h-3.5 mr-1" /> Check In Now
            </Button>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-200/60 pb-3.5">
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-600 text-white mr-2.5 shadow-2xs">
                  {data.class_code}
                </span>
                <span className="font-extrabold text-slate-900 text-sm">{data.class_name}</span>
                <span className="text-xs text-slate-500 font-medium block sm:inline sm:ml-2">({data.room})</span>
              </div>

              {/* Real-time Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                  data.live_status === 'Checked Out'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                ● {data.live_status} ({data.status})
              </span>
            </div>

            {/* 3 Metrics: Check-in Time, Check-out Time, Class Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-3.5 bg-white rounded-lg border border-blue-100 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Check-in Time</span>
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {new Date(data.checkin_time).toLocaleTimeString()}
                </span>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-blue-100 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Check-out Time</span>
                <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <LogOut className="w-4 h-4 text-amber-600 shrink-0" />
                  {data.checkout_time ? new Date(data.checkout_time).toLocaleTimeString() : 'Still Inside'}
                </span>
              </div>

              <div className="p-3.5 bg-white rounded-lg border border-blue-100 shadow-2xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-sans">Class Duration</span>
                <span className="font-bold text-blue-700 text-sm flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  {data.duration_formatted}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentDashboardPage;
