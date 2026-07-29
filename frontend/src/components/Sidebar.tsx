import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  PlayCircle,
  History,
  User,
  X,
  CheckCircle,
  Camera,
  Users,
  Calendar,
  FileText,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  activeTab = 'dashboard',
  onSelectTab,
}) => {
  const { user } = useAuth();

  const isFaculty = user?.role === 'faculty';
  const isStudent = user?.role === 'student';

  // Faculty navigation items
  const facultyNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'sessions', label: 'Attendance Sessions', icon: PlayCircle },
    { id: 'history', label: 'Attendance History', icon: History },
    { id: 'profile', label: 'Profile Settings', icon: User },
  ];

  // Student navigation items
  const studentNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Check-in Attendance', icon: CheckCircle },
    { id: 'history', label: 'My Attendance Logs', icon: History },
    { id: 'enrollment', label: 'Facial Enrollment', icon: Camera },
    { id: 'profile', label: 'Profile Settings', icon: User },
  ];

  // Admin / Fallback navigation items
  const defaultNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Users & Attendance', icon: Users },
    { id: 'recognition', label: 'Face Recognition', icon: Camera },
    { id: 'schedules', label: 'Schedules', icon: Calendar },
    { id: 'reports', label: 'Reports & Logs', icon: FileText },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  const navItems = isFaculty
    ? facultyNavItems
    : isStudent
    ? studentNavItems
    : defaultNavItems;

  const handleNavClick = (id: string) => {
    if (onSelectTab) onSelectTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 transition-transform duration-200 ease-in-out md:translate-x-0 md:top-[53px] flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile Top Bar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 md:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              FT
            </div>
            <span className="text-sm font-bold text-slate-900">Navigation Menu</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section Header Label */}
        <div className="px-5 pt-4 pb-1">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Main Navigation
          </p>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 py-2 space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-bold border-l-3 border-blue-600 shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom User Profile Card (No Logout Button here) */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
          {user && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200 uppercase shrink-0">
                {user.name.slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
                <p className="text-[10px] text-slate-500 capitalize truncate">
                  {user.role} • {user.identifier}
                </p>
              </div>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" aria-label="Security Verified" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
