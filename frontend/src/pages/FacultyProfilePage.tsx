import React from 'react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Key, ShieldCheck, Mail, User as UserIcon, Building2 } from 'lucide-react';

export const FacultyProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl animate-in">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Faculty Profile Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Manage your faculty account details, program affiliation, and security credentials</p>
      </div>

      <Card title="Account Overview">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-extrabold text-xl flex items-center justify-center border-2 border-blue-200 uppercase shadow-xs shrink-0">
            {user?.name ? user.name.slice(0, 2) : 'FC'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.name || 'Dr. Sarah Jenkins'}</h2>
            <p className="text-xs text-slate-500 font-medium">{user?.department || 'Computer Science Department'}</p>
            <span className="inline-flex items-center gap-1.5 mt-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Faculty ID: {user?.identifier || 'FAC-2026-001'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Full Name" icon={<UserIcon className="w-4 h-4" />} defaultValue={user?.name || 'Dr. Sarah Jenkins'} readOnly />
          <Input label="Faculty ID" icon={<ShieldCheck className="w-4 h-4" />} defaultValue={user?.identifier || 'FAC-2026-001'} readOnly />
          <Input label="Email Address" icon={<Mail className="w-4 h-4" />} defaultValue={user?.email || 'sjenkins@facetrack.edu'} readOnly />
          <Input label="Department" icon={<Building2 className="w-4 h-4" />} defaultValue={user?.department || 'Computer Science'} readOnly />
        </div>
      </Card>

      <Card title="Security & Password" subtitle="Update your password and security credentials">
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

export default FacultyProfilePage;
