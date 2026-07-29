import React from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Key, GraduationCap, Mail, User as UserIcon, Building2 } from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl animate-in">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Student Profile Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your student profile details, program information, and password security</p>
      </div>

      <Card title="Account Overview">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xl flex items-center justify-center border-2 border-blue-200 uppercase shadow-xs shrink-0">
            {user?.name ? user.name.slice(0, 2) : 'ST'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.name || 'Alex Rivera'}</h2>
            <p className="text-xs text-slate-500 font-medium">{user?.department || 'Information Technology'}</p>
            <span className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
              <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
              Student Number: {user?.identifier || '2026-0101'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" icon={<UserIcon className="w-4 h-4" />} defaultValue={user?.name || 'Alex Rivera'} readOnly />
          <Input label="Student Number" icon={<GraduationCap className="w-4 h-4" />} defaultValue={user?.identifier || '2026-0101'} readOnly />
          <Input label="Email Address" icon={<Mail className="w-4 h-4" />} defaultValue={user?.email || 'arivera@student.facetrack.edu'} readOnly />
          <Input label="Program / Department" icon={<Building2 className="w-4 h-4" />} defaultValue={user?.department || 'Information Technology'} readOnly />
        </div>
      </Card>

      <Card title="Security & Password" subtitle="Update your password credentials">
        <div className="space-y-4 max-w-md">
          <Input label="Current Password" type="password" placeholder="••••••••" />
          <Input label="New Password" type="password" placeholder="••••••••" />
          <Input label="Confirm New Password" type="password" placeholder="••••••••" />
          <Button variant="primary">
            <Key className="w-4 h-4 mr-1.5" /> Update Password
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StudentProfilePage;
