import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import { historyService, type HistoryItem } from '../services/historyService';
import { classService, type ClassItem } from '../services/classService';
import { Download, RefreshCw, Database } from 'lucide-react';

export const StudentHistoryPage: React.FC = () => {
  const [records, setRecords] = useState<HistoryItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [date, setDate] = useState<string>('');
  const [classId, setClassId] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

  const fetchClassesAndHistory = async () => {
    setIsLoading(true);
    try {
      const [classesData, historyData] = await Promise.all([
        classService.getClasses(),
        historyService.getHistory({ date, class_id: classId, status }),
      ]);
      setClasses(classesData);
      setRecords(historyData);
    } catch {
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassesAndHistory();
  }, [date, classId, status]);

  const handleExportCSV = async () => {
    try {
      await historyService.downloadCSV({ date, class_id: classId, status });
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV.');
    }
  };

  const handleResetFilters = () => {
    setDate('');
    setClassId('all');
    setStatus('all');
  };

  const columns = [
    {
      header: 'Course Code',
      cell: (row: HistoryItem) => (
        <span className="font-bold text-blue-600 font-mono text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200/80">{row.class_code}</span>
      ),
    },
    {
      header: 'Subject Name',
      cell: (row: HistoryItem) => <span className="font-semibold text-slate-900">{row.class_name}</span>,
    },
    {
      header: 'Section / Room',
      cell: (row: HistoryItem) => (
        <span className="text-xs text-slate-600 font-medium">
          {row.section || 'Sec 1'} • {row.room || 'Lab 1'}
        </span>
      ),
    },
    {
      header: 'Check-in Time',
      cell: (row: HistoryItem) => (
        <span className="text-xs text-slate-700 font-medium">
          {new Date(row.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Check-out Time',
      cell: (row: HistoryItem) => (
        <span className="text-xs text-slate-600 font-medium">
          {row.checkout_time ? new Date(row.checkout_time).toLocaleTimeString() : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Status',
      cell: (row: HistoryItem) => {
        const st = strtolower(row.status);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              st === 'present'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                : st === 'late'
                ? 'bg-amber-50 text-amber-700 border-amber-200/80'
                : 'bg-red-50 text-red-700 border-red-200/80'
            }`}
          >
            ● {ucfirst(row.status)}
          </span>
        );
      },
    },
  ];

  function strtolower(str: string): string {
    return (str || '').toLowerCase();
  }

  function ucfirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">My Attendance History</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase">
              <Database className="w-3 h-3 text-emerald-600" /> Neon DB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Filter your personal class attendance history and download CSV reports</p>
        </div>

        <Button variant="primary" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-1.5" /> Export My History (CSV)
        </Button>
      </div>

      {/* Filter Card */}
      <Card title="Filter My Attendance" subtitle="Filter by Date, Course Class, and Status">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          {/* Date Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
            />
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs cursor-pointer"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} - {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div>
            <Button variant="secondary" className="w-full" onClick={handleResetFilters}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reset Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Table Card */}
      <Card title="Personal History Records" subtitle={`Displaying ${records.length} attendance records`}>
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading your attendance history...</div>
        ) : (
          <Table columns={columns} data={records} keyExtractor={(r) => r.id} emptyMessage="No attendance records found matching filters." />
        )}
      </Card>
    </div>
  );
};

export default StudentHistoryPage;
