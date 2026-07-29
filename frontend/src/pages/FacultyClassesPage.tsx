import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Table from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';
import { classService, type ClassItem } from '../services/classService';
import { enrollmentService, type StudentUser, type EnrolledStudent } from '../services/enrollmentService';
import { Plus, Search, Edit2, Trash2, X, Check, Database, Users, UserPlus, UserMinus } from 'lucide-react';

export const FacultyClassesPage: React.FC = () => {
  const { success: toastSuccess, error: toastError } = useToast();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Class Create / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form Fields for Class Create / Edit
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [section, setSection] = useState('Sec 1');
  const [room, setRoom] = useState('Lab 1');

  // Modal State for Student Enrollment Roster
  const [selectedClassForRoster, setSelectedClassForRoster] = useState<ClassItem | null>(null);
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([]);
  const [allStudents, setAllStudents] = useState<StudentUser[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [isRosterLoading, setIsRosterLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClasses = async (query = '') => {
    setIsLoading(true);
    try {
      const data = await classService.getClasses(query);
      setClasses(data);
    } catch {
      setClasses([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses(searchTerm);
  }, [searchTerm]);

  const handleOpenAddModal = () => {
    setEditingId(null);
    setCode('');
    setName('');
    setSection('CS-1A');
    setRoom('Lab 3');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ClassItem) => {
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
    setSection(item.section || 'Sec 1');
    setRoom(item.room || 'Lab 1');
    setError(null);
    setIsModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim() || !name.trim() || !section.trim() || !room.trim()) {
      setError('Please fill in all fields (Subject Code, Subject Name, Section, and Room).');
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingId) {
        await classService.updateClass({
          id: editingId,
          code: code.trim(),
          name: name.trim(),
          section: section.trim(),
          room: room.trim(),
        });
        toastSuccess('Class Updated', `Class ${code.trim()} has been updated successfully.`);
      } else {
        await classService.createClass({
          code: code.trim(),
          name: name.trim(),
          section: section.trim(),
          room: room.trim(),
        });
        toastSuccess('Class Created', `Class ${code.trim()} has been created successfully.`);
      }
      setIsModalOpen(false);
      fetchClasses(searchTerm);
    } catch (err: any) {
      setError(err.message || 'Failed to save class in database.');
      toastError('Save Failed', err.message || 'Failed to save class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClass = async (id: number, className: string) => {
    if (window.confirm(`Are you sure you want to delete class "${className}"?`)) {
      try {
        await classService.deleteClass(id);
        toastSuccess('Class Deleted', `Class "${className}" removed.`);
        fetchClasses(searchTerm);
      } catch (err: any) {
        toastError('Delete Failed', err.message || 'Failed to delete class.');
      }
    }
  };

  // Student Enrollment Roster Handlers
  const handleOpenRosterModal = async (classItem: ClassItem) => {
    setSelectedClassForRoster(classItem);
    setRosterError(null);
    setStudentSearch('');
    setIsRosterLoading(true);

    try {
      const [enrolled, students] = await Promise.all([
        enrollmentService.getEnrolledStudents(classItem.id),
        enrollmentService.getStudents(''),
      ]);
      setEnrolledStudents(enrolled);
      setAllStudents(students);
    } catch {
      setEnrolledStudents([]);
      setAllStudents([]);
    } finally {
      setIsRosterLoading(false);
    }
  };

  const handleSearchStudents = async (query: string) => {
    setStudentSearch(query);
    try {
      const students = await enrollmentService.getStudents(query);
      setAllStudents(students);
    } catch {
      setAllStudents([]);
    }
  };

  const handleEnrollStudent = async (studentId: number) => {
    if (!selectedClassForRoster) return;
    setRosterError(null);

    try {
      await enrollmentService.enrollStudent(selectedClassForRoster.id, studentId);
      const enrolled = await enrollmentService.getEnrolledStudents(selectedClassForRoster.id);
      setEnrolledStudents(enrolled);
      toastSuccess('Student Enrolled', 'Student added to class roster.');
      fetchClasses(searchTerm);
    } catch (err: any) {
      setRosterError(err.message || 'Failed to enroll student.');
      toastError('Enrollment Failed', err.message || 'Failed to enroll student.');
    }
  };

  const handleRemoveStudent = async (enrollmentId: number, studentName: string) => {
    if (!selectedClassForRoster) return;
    if (window.confirm(`Remove ${studentName} from this class?`)) {
      setRosterError(null);
      try {
        await enrollmentService.removeStudent(enrollmentId);
        const enrolled = await enrollmentService.getEnrolledStudents(selectedClassForRoster.id);
        setEnrolledStudents(enrolled);
        toastSuccess('Student Removed', `${studentName} removed from class.`);
        fetchClasses(searchTerm);
      } catch (err: any) {
        setRosterError(err.message || 'Failed to remove student.');
        toastError('Removal Failed', err.message || 'Failed to remove student.');
      }
    }
  };

  const columns = [
    {
      header: 'Subject Code',
      cell: (row: ClassItem) => (
        <span className="font-bold text-blue-600 font-mono text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200/80">{row.code}</span>
      ),
    },
    {
      header: 'Subject Name',
      cell: (row: ClassItem) => <span className="font-semibold text-slate-900">{row.name}</span>,
    },
    {
      header: 'Section',
      cell: (row: ClassItem) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          {row.section || 'Sec 1'}
        </span>
      ),
    },
    {
      header: 'Room',
      cell: (row: ClassItem) => <span className="text-slate-700 text-xs font-medium">{row.room || 'Lab 1'}</span>,
    },
    {
      header: 'Enrolled Students',
      cell: (row: ClassItem) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/80">
          <Users className="w-3.5 h-3.5" />
          {row.enrolled_count ?? 0} Students
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row: ClassItem) => (
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => handleOpenRosterModal(row)}>
            <UserPlus className="w-3.5 h-3.5 mr-1" /> Manage Roster
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleOpenEditModal(row)}>
            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDeleteClass(row.id, row.name)}>
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-in">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Class Roster Management</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 uppercase">
              <Database className="w-3 h-3 text-emerald-600" /> Neon DB
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Create, edit, search, and manage student enrollments for your classes</p>
        </div>
        <Button variant="primary" onClick={handleOpenAddModal}>
          <Plus className="w-4 h-4 mr-1.5" /> Create New Class
        </Button>
      </div>

      {/* Search Input Card */}
      <Card title="Search Classes" subtitle="Filter by Subject Code, Subject Name, Section, or Room">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Subject Code, Name, Section, Room..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
          />
        </div>
      </Card>

      {/* Classes Table */}
      <Card title="All Classes Roster" subtitle={`Displaying ${classes.length} active class records`}>
        {isLoading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading classes from database...</div>
        ) : (
          <Table columns={columns} data={classes} keyExtractor={(c) => c.id} emptyMessage="No classes found. Click 'Create New Class' to add one." />
        )}
      </Card>

      {/* Create / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl max-w-md w-full p-6 space-y-4 animate-in">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? 'Edit Class Details' : 'Create New Class'}
              </h3>
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

            <form onSubmit={handleSaveClass} className="space-y-4">
              <Input
                label="Subject Code"
                placeholder="e.g. CS101"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />

              <Input
                label="Subject Name"
                placeholder="e.g. Introduction to Computer Science"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Section"
                placeholder="e.g. CS-1A"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                required
              />

              <Input
                label="Room"
                placeholder="e.g. Lab 3"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                required
              />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmitting}>
                  {isSubmitting ? (
                    'Saving...'
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-1" /> {editingId ? 'Update Class' : 'Save Class'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Enrollment Roster Modal */}
      {selectedClassForRoster && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Enrolled Roster: {selectedClassForRoster.code} ({selectedClassForRoster.name})
                </h3>
                <p className="text-xs text-slate-500">Manage student class enrollments stored in Neon PostgreSQL</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClassForRoster(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rosterError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200/80 text-xs text-red-700 shrink-0 font-medium">
                {rosterError}
              </div>
            )}

            <div className="overflow-y-auto space-y-6 flex-1 pr-1">
              {/* Enrolled Students Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Currently Enrolled Students ({enrolledStudents.length})
                </h4>
                {isRosterLoading ? (
                  <p className="text-xs text-slate-400 py-4">Loading roster...</p>
                ) : enrolledStudents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 font-medium bg-slate-50 rounded-xl p-3 border border-slate-200">
                    No students currently enrolled in this class. Select from all registered students below to enroll.
                  </p>
                ) : (
                  <div className="border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-3 py-2.5">Student Number</th>
                          <th className="px-3 py-2.5">Full Name</th>
                          <th className="px-3 py-2.5">Department</th>
                          <th className="px-3 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {enrolledStudents.map((st) => (
                          <tr key={st.enrollment_id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-blue-600">{st.student_number}</td>
                            <td className="px-3 py-2 font-semibold text-slate-900">{st.student_name}</td>
                            <td className="px-3 py-2 text-slate-600">{st.department || 'N/A'}</td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleRemoveStudent(st.enrollment_id, st.student_name)}
                              >
                                <UserMinus className="w-3 h-3 mr-1" /> Remove
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Enroll New Student Search Box */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Search & Enroll Registered Students
                </h4>

                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student number, name, or email..."
                    value={studentSearch}
                    onChange={(e) => handleSearchStudents(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                  />
                </div>

                <div className="border border-slate-200/80 rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2.5">Student Number</th>
                        <th className="px-3 py-2.5">Name</th>
                        <th className="px-3 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {allStudents.map((st) => {
                        const isEnrolled = enrolledStudents.some((e) => e.student_id === st.id);
                        return (
                          <tr key={st.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2 font-mono font-bold text-slate-800">{st.student_number}</td>
                            <td className="px-3 py-2 font-semibold text-slate-900">{st.name}</td>
                            <td className="px-3 py-2 text-right">
                              {isEnrolled ? (
                                <span className="text-[11px] font-bold text-emerald-600">✓ Enrolled</span>
                              ) : (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleEnrollStudent(st.id)}
                                >
                                  <UserPlus className="w-3 h-3 mr-1" /> Enroll Student
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end shrink-0">
              <Button variant="secondary" onClick={() => setSelectedClassForRoster(null)}>
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyClassesPage;
