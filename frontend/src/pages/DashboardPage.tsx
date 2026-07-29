import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import { Users, CheckCircle, Clock, Trash2 } from 'lucide-react';
import { dataService, type SystemStats, type AttendanceRecord } from '../services/dataService';

export const DashboardPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([dataService.getStats(), dataService.getRecentLogs()]).then(([sData, lData]) => {
      setStats(sData);
      setRecords(lData);
      setIsLoading(false);
    });
  }, []);

  const filteredRecords = records.filter(
    (r) =>
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const columns = [
    { header: 'ID', accessorKey: 'id' as keyof AttendanceRecord },
    {
      header: 'Student Name',
      cell: (row: AttendanceRecord) => (
        <span className="font-medium text-gray-900">{row.studentName}</span>
      ),
    },
    { header: 'Department', accessorKey: 'department' as keyof AttendanceRecord },
    {
      header: 'Time In',
      cell: (row: AttendanceRecord) => (
        <span className="text-xs font-mono text-gray-700">
          {row.timestamp ? new Date(row.timestamp).toLocaleString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: AttendanceRecord) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            row.status === 'Present'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : row.status === 'Late'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          ● {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row: AttendanceRecord) => (
        <div className="flex items-center gap-2">
          <Button variant="danger" size="sm" onClick={() => handleDelete(row.id)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">System Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            FaceTrack facial recognition and attendance management overview.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Total Registered Students</p>
            <h2 className="text-2xl font-bold text-gray-900">{stats.totalStudents}</h2>
            <p className="text-[11px] text-gray-500">Neon PostgreSQL Records</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Present Students</p>
            <h2 className="text-2xl font-bold text-gray-900">{stats.presentStudents}</h2>
            <p className="text-[11px] text-emerald-600 font-medium">{stats.attendanceRate}% attendance rate</p>
          </div>
        </Card>

        <Card className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Late Arrivals</p>
            <h2 className="text-2xl font-bold text-gray-900">{stats.lateStudents}</h2>
            <p className="text-[11px] text-amber-600 font-medium">Grace period exceeded</p>
          </div>
        </Card>
      </div>

      {/* Input & Form Control Demo Card */}
      <Card title="Quick Search & Controls" subtitle="Filter attendance records by user name or department">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Search Query"
              placeholder="Search user name or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button variant="primary" className="w-full">
              Search
            </Button>
            <Button variant="secondary" onClick={() => setSearchTerm('')}>
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Striped Table Card */}
      <Card
        title="Recent Attendance Logs"
        subtitle="Real-time facial recognition status logs"
        action={
          <span className="text-xs text-gray-400">
            Showing {filteredRecords.length} records
          </span>
        }
      >
        {isLoading ? (
          <div className="py-6 text-center text-xs text-gray-500">Loading recent logs...</div>
        ) : (
          <Table columns={columns} data={filteredRecords} keyExtractor={(r) => r.id} emptyMessage="No attendance logs found." />
        )}
      </Card>
    </div>
  );
};

export default DashboardPage;
