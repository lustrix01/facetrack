import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';
import { sessionService, type SessionItem } from '../services/sessionService';
import { classService, type ClassItem } from '../services/classService';
import { Play, StopCircle, MapPin, X, Check, Database, Navigation } from 'lucide-react';

export const FacultySessionsPage: React.FC = () => {
  const { success, error: toastError, info } = useToast();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Start Session Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [classId, setClassId] = useState<number | string>('');
  const [latitude, setLatitude] = useState('14.5995');
  const [longitude, setLongitude] = useState('120.9842');
  const [radiusMeters, setRadiusMeters] = useState('50');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchSessionsAndClasses = async () => {
    setIsLoading(true);
    try {
      const [sessionsData, classesData] = await Promise.all([
        sessionService.getSessions(),
        classService.getClasses(),
      ]);
      setSessions(sessionsData);
      setClasses(classesData);
      if (classesData.length > 0 && !classId) {
        setClassId(classesData[0].id);
      }
    } catch {
      setSessions([]);
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionsAndClasses();
  }, []);

  const handleGetClassroomGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(6));
          setLongitude(pos.coords.longitude.toFixed(6));
          info('Classroom GPS Captured', `Lat: ${pos.coords.latitude.toFixed(4)}, Lon: ${pos.coords.longitude.toFixed(4)}`);
        },
        () => {
          toastError('GPS Permission Required', 'Allow location access in browser settings to set the classroom geofence.');
        }
      );
    } else {
      toastError('GPS Not Supported', 'Your browser does not support geolocation.');
    }
  };

  const handleOpenStartModal = () => {
    setError(null);
    if (classes.length > 0) {
      setClassId(classes[0].id);
    }
    setIsModalOpen(true);
  };

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!classId) {
      setError('Please select a class to start an attendance session.');
      return;
    }

    setIsSubmitting(true);

    try {
      await sessionService.startSession({
        class_id: Number(classId),
        latitude: parseFloat(latitude) || 14.5995,
        longitude: parseFloat(longitude) || 120.9842,
        radius_meters: parseInt(radiusMeters, 10) || 50,
      });

      setIsModalOpen(false);
      success('Attendance Session Started!', `Geofence set at ${latitude}, ${longitude} (${radiusMeters}m radius).`);
      fetchSessionsAndClasses();
    } catch (err: any) {
      setError(err.message || 'Failed to start session.');
      toastError('Failed to Start Session', err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndSession = async (id: number) => {
    if (window.confirm('Are you sure you want to end this attendance session?')) {
      try {
        await sessionService.endSession(id);
        success('Session Ended', 'Attendance session has been closed successfully.');
        fetchSessionsAndClasses();
      } catch (err: any) {
        toastError('Failed to End Session', err.message || 'An error occurred.');
      }
    }
  };

  const columns = [
    {
      header: 'Class',
      cell: (row: SessionItem) => (
        <div>
          <span className="font-bold text-blue-600 font-mono text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200/80">{row.class_code}</span>
          <span className="font-semibold text-slate-900 block text-xs mt-0.5">{row.class_name}</span>
          <span className="text-[11px] text-slate-500 font-medium">{row.section || 'Sec 1'} • {row.room || 'Lab 1'}</span>
        </div>
      ),
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
      header: 'End Time',
      cell: (row: SessionItem) => (
        <span className="text-xs text-slate-600 font-medium">
          {row.end_time ? new Date(row.end_time).toLocaleTimeString() : 'Ongoing'}
        </span>
      ),
    },
    {
      header: 'Geofence Location & Radius',
      cell: (row: SessionItem) => (
        <div className="text-xs space-y-0.5">
          <span className="font-mono text-slate-800 block text-[11px] font-semibold">
            {row.latitude}, {row.longitude}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/80">
            <MapPin className="w-3 h-3 text-blue-600" /> Radius: {row.radius_meters || 50}m
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      cell: (row: SessionItem) => {
        const isActive = row.status === 'active';
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 animate-pulse'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            ● {isActive ? 'Active' : 'Ended'}
          </span>
        );
      },
    },
    {
      header: 'Action',
      cell: (row: SessionItem) =>
        row.status === 'active' ? (
          <Button variant="danger" size="sm" onClick={() => handleEndSession(row.id)}>
            <StopCircle className="w-3.5 h-3.5 mr-1" /> End Session
          </Button>
        ) : (
          <span className="text-xs text-slate-400 font-medium">Session Closed</span>
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Attendance Session Management</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase">
              <Database className="w-3 h-3 text-emerald-600" /> Neon DB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Start & end attendance sessions with classroom GPS location & geofencing radius</p>
        </div>
        <Button variant="primary" onClick={handleOpenStartModal}>
          <Play className="w-4 h-4 mr-1.5" /> Start New Session
        </Button>
      </div>

      {/* Main Table */}
      <Card title="Attendance Sessions History" subtitle={`Displaying ${sessions.length} sessions`}>
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading attendance sessions from database...</div>
        ) : (
          <Table columns={columns} data={sessions} keyExtractor={(s) => s.id} emptyMessage="No attendance sessions found." />
        )}
      </Card>

      {/* Start Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl max-w-md w-full p-6 space-y-4 animate-in">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Start Attendance Session</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleStartSession} className="space-y-4">
              {/* Select Class */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Select Class</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer shadow-2xs"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.name} ({c.section || 'Sec 1'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Classroom GPS Capture */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-blue-600" /> Classroom Location (GPS)
                  </span>
                  <button
                    type="button"
                    onClick={handleGetClassroomGPS}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" /> Get Current GPS
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Classroom Latitude"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                  />
                  <Input
                    label="Classroom Longitude"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Allowed Radius */}
              <Input
                label="Allowed Radius (Meters)"
                type="number"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                placeholder="50"
                required
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Starting...'
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" /> Start Session Now
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultySessionsPage;
