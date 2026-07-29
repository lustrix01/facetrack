import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import { dataService, type SystemStats } from '../services/dataService';
import { faceService, type FacultyFaceRosterItem } from '../services/faceService';
import { UserCheck, Clock, LogOut, UserPlus, Play, Database, ShieldCheck, CheckCircle2, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { sessionService, type SessionItem } from '../services/sessionService';

export const FacultyDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<SystemStats>({
    totalClasses: 0,
    todaySessions: 0,
    presentStudents: 0,
    lateStudents: 0,
    checkedOutStudents: 0,
    stillInsideStudents: 0,
    totalStudents: 0,
    totalFaculty: 0,
    attendanceRate: 100.0,
  });

  const [liveSessions, setLiveSessions] = useState<SessionItem[]>([]);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);

  const [faceRoster, setFaceRoster] = useState<FacultyFaceRosterItem[]>([]);
  const [isFaceRosterLoading, setIsFaceRosterLoading] = useState(true);

  useEffect(() => {
    dataService.getStats().then((data) => {
      setStats(data);
    });

    sessionService.getSessions().then((sessions) => {
      setLiveSessions(sessions);
      setIsSessionsLoading(false);
    });

    faceService.getFacultyFaceRoster().then((roster) => {
      setFaceRoster(roster);
      setIsFaceRosterLoading(false);
    });
  }, []);

  const sessionColumns = [
    {
      header: 'Course Code',
      cell: (row: SessionItem) => (
        <span className="font-bold text-blue-600 font-mono text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200/80">{row.class_code}</span>
      ),
    },
    {
      header: 'Class Name',
      cell: (row: SessionItem) => (
        <span className="font-semibold text-slate-900">{row.class_name}</span>
      )
    },
    {
      header: 'Start Time',
      cell: (row: SessionItem) => (
        <span className="text-xs text-slate-700 font-medium">
          {new Date(row.start_time).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Room & Section',
      cell: (row: SessionItem) => (
        <span className="text-xs text-slate-600 font-medium">
          {row.room || 'Lab 1'} ({row.section || 'Sec 1'})
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: SessionItem) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
            row.status === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 animate-pulse'
              : 'bg-slate-100 text-slate-600 border-slate-200'
          }`}
        >
          ● {row.status === 'active' ? 'Active Session' : 'Ended'}
        </span>
      ),
    },
    {
      header: 'Geofence Radius',
      cell: (row: SessionItem) => (
        <span className="text-xs font-mono text-slate-700 font-semibold">
          {row.radius_meters}m
        </span>
      ),
    },
  ];

  const faceRosterColumns = [
    {
      header: 'Student Number',
      cell: (row: FacultyFaceRosterItem) => (
        <span className="font-mono text-xs font-bold text-blue-600">{row.student_number}</span>
      ),
    },
    {
      header: 'Student Name',
      cell: (row: FacultyFaceRosterItem) => (
        <span className="font-semibold text-slate-900">{row.student_name}</span>
      ),
    },
    { header: 'Department', accessorKey: 'department' as keyof FacultyFaceRosterItem },
    {
      header: 'Privacy Consent (Audit)',
      cell: (row: FacultyFaceRosterItem) => {
        const agreed = row.consent_agreed;
        return (
          <div className="space-y-0.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                agreed
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : 'bg-red-50 text-red-700 border-red-200/80'
              }`}
            >
              {agreed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
              {agreed ? 'Agreed' : 'Not Agreed'}
            </span>
            {agreed && row.consent_agreed_at && (
              <span className="text-[10px] text-slate-400 block font-mono">
                {new Date(row.consent_agreed_at).toLocaleDateString()}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Facial Enrollment Status',
      cell: (row: FacultyFaceRosterItem) => {
        const isCompleted = row.enrollment_status === 'completed';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              isCompleted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : 'bg-amber-50 text-amber-700 border-amber-200/80'
            }`}
          >
            {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
            {isCompleted ? 'Completed' : 'Pending Enrollment'}
          </span>
        );
      },
    },
    {
      header: 'Enrollment Date',
      cell: (row: FacultyFaceRosterItem) => (
        <span className="text-xs text-slate-600 font-medium">
          {row.enrolled_at ? new Date(row.enrolled_at).toLocaleString() : 'N/A'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Welcome back, {user?.name || 'Faculty Member'}
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/80 uppercase">
              {user?.identifier || 'FAC-2026-001'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 font-normal">
            Faculty Overview • {user?.department || 'Computer Science Department'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            Live Neon Database
          </div>
          <Button variant="primary">
            <Play className="w-4 h-4 mr-1.5" /> Start Attendance Session
          </Button>
        </div>
      </div>

      {/* 4 SAAS STATISTIC CARDS WITH TREND INDICATORS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Present Card */}
        <Card className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Present Today</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.presentStudents}</h2>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats.attendanceRate}% attendance rate</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        </Card>

        {/* Late Card */}
        <Card className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Late Arrivals</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.lateStudents}</h2>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <Clock className="w-3.5 h-3.5" />
              <span>Grace period exceeded</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </Card>

        {/* Checked Out Card */}
        <Card className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Checked Out</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.checkedOutStudents}</h2>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600">
              <LogOut className="w-3.5 h-3.5" />
              <span>Completed session</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
        </Card>

        {/* Still Inside Card */}
        <Card className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Still Inside</p>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">{stats.stillInsideStudents}</h2>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Active in classroom</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Today's Sessions Table */}
      <Card title="Today's Attendance Sessions" subtitle="Manage and monitor live facial recognition sessions">
        {isSessionsLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading attendance sessions...</div>
        ) : (
          <Table columns={sessionColumns} data={liveSessions} keyExtractor={(s) => s.id} emptyMessage="No attendance sessions found for today." />
        )}
      </Card>

      {/* Student Facial Enrollment Completion Roster */}
      <Card
        title="Student Facial Enrollment Completion Status"
        subtitle="Privacy Protected: Displays completion status and enrollment date only (Raw face data restricted)"
      >
        <div className="mb-4 p-3 rounded-lg bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 flex items-center gap-2 font-medium shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>Data Privacy Active: Raw facial embedding vectors and image files are strictly restricted.</span>
        </div>

        {isFaceRosterLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading student enrollment status...</div>
        ) : (
          <Table columns={faceRosterColumns} data={faceRoster} keyExtractor={(r) => r.student_id} />
        )}
      </Card>
    </div>
  );
};

export default FacultyDashboardPage;
