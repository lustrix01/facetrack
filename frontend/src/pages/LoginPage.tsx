import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';
import { UserCheck, Eye, EyeOff, GraduationCap, Database, UserPlus, LogIn, Lock, Mail, User as UserIcon, Building2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();
  
  // Auth Mode: 'login' or 'register'
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [role, setRole] = useState<UserRole>('faculty');

  // Form Fields
  const [identifier, setIdentifier] = useState('FAC-2026-001');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [department, setDepartment] = useState('Computer Science');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setError(null);
    if (mode === 'login') {
      if (newRole === 'faculty') {
        setIdentifier('FAC-2026-001');
      } else {
        setIdentifier('2026-0101');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError(role === 'faculty' ? 'Please enter your Faculty ID.' : 'Please enter your Student Number.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setIsSubmitting(false);
          return;
        }
        if (!email.trim()) {
          setError('Please enter your email address.');
          setIsSubmitting(false);
          return;
        }

        await register({
          identifier: identifier.trim(),
          name: name.trim(),
          email: email.trim(),
          password,
          role,
          department: department.trim() || 'General',
          rememberMe,
        });
      } else {
        await login({
          identifier: identifier.trim(),
          password,
          role,
          rememberMe,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication error. Please check your inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemo = (demoRole: UserRole, demoId: string) => {
    setMode('login');
    setRole(demoRole);
    setIdentifier(demoId);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans antialiased selection:bg-blue-600 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white font-extrabold text-xl shadow-xs border border-blue-600/30 mb-1">
            FT
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">FaceTrack</h1>
          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            {mode === 'login' ? 'Sign in to access your attendance management portal' : 'Register a new account directly in Neon PostgreSQL'}
          </p>

          {/* Database Connection Indicator */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            Live Neon PostgreSQL Connected
          </div>
        </div>

        <Card className="shadow-xs border-slate-200/80">
          {/* Main Auth Mode Tabs: Sign In vs Sign Up */}
          <div className="flex border-b border-slate-100 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition-all cursor-pointer ${
                mode === 'login'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 inline mr-1.5" />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
                setIdentifier('');
              }}
              className={`flex-1 py-2.5 text-xs font-bold border-b-2 text-center transition-all cursor-pointer ${
                mode === 'register'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-400 hover:text-slate-700'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />
              Register Account
            </button>
          </div>

          {/* Role Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-lg mb-5 gap-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => handleRoleChange('faculty')}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                role === 'faculty'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Faculty {mode === 'register' ? 'Reg.' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('student')}
              className={`flex items-center justify-center gap-2 py-2 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                role === 'student'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student {mode === 'register' ? 'Reg.' : 'Login'}
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200/80 text-xs text-red-700 flex items-start gap-2 animate-in">
              <span className="font-bold shrink-0">●</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Additional Fields for Registration */}
            {mode === 'register' && (
              <>
                <Input
                  label="Full Name"
                  placeholder="e.g. Dr. Sarah Jenkins"
                  icon={<UserIcon className="w-4 h-4" />}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. user@facetrack.edu"
                  icon={<Mail className="w-4 h-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Input
                  label="Department / Program"
                  placeholder="e.g. Computer Science"
                  icon={<Building2 className="w-4 h-4" />}
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </>
            )}

            {/* Identifier Input */}
            <Input
              label={role === 'faculty' ? 'Faculty ID' : 'Student Number'}
              placeholder={role === 'faculty' ? 'e.g. FAC-2026-001' : 'e.g. 2026-0101'}
              icon={<UserCheck className="w-4 h-4" />}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            {/* Password Input */}
            <div className="w-full">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-10 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all shadow-2xs"
                  placeholder="Enter password (min 6 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500/20"
                />
                <span className="text-xs text-slate-600">Remember login session</span>
              </label>
            </div>

            {/* Submit Primary Button */}
            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 text-xs font-bold"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  Processing Authentication...
                </span>
              ) : mode === 'register' ? (
                `Create ${role === 'faculty' ? 'Faculty' : 'Student'} Account`
              ) : (
                `Sign In as ${role === 'faculty' ? 'Faculty' : 'Student'}`
              )}
            </Button>
          </form>

          {/* Quick Fill Demo Badges for Login Mode */}
          {mode === 'login' && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-400 font-semibold mb-2 uppercase tracking-wider">Database Seed Credentials:</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fillDemo('faculty', 'FAC-2026-001')}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-[11px] font-mono font-semibold text-slate-700 hover:text-blue-600 border border-slate-200/80 transition-all cursor-pointer"
                >
                  Faculty: FAC-2026-001
                </button>
                <button
                  type="button"
                  onClick={() => fillDemo('student', '2026-0101')}
                  className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-blue-50 text-[11px] font-mono font-semibold text-slate-700 hover:text-blue-600 border border-slate-200/80 transition-all cursor-pointer"
                >
                  Student: 2026-0101
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-400 font-medium">
          FaceTrack Management System • PostgreSQL REST API
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
