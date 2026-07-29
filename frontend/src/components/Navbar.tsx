import React from 'react';
import { Menu, Bell, Search, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onToggleSidebar: () => void;
  activeTabName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, activeTabName = 'Dashboard' }) => {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-2.5 md:px-6 transition-all duration-150">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Brand / Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-xs border border-blue-600/30">
              FT
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-bold text-slate-900 tracking-tight">FaceTrack</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-semibold text-blue-600 capitalize">{user?.role || 'Portal'}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              <span className="font-medium text-slate-600 hidden sm:inline">{activeTabName}</span>
            </div>
          </div>
        </div>

        {/* Middle: Search Input */}
        <div className="hidden md:block w-72">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search classes, students, sessions..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Right: Actions & User Dropdown */}
        <div className="flex items-center gap-3">
          {/* Notification Button */}
          <button
            type="button"
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white animate-pulse"></span>
          </button>

          <div className="h-5 w-px bg-slate-200"></div>

          {/* User Profile Badge */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-200 uppercase shrink-0 shadow-2xs">
              {user?.name ? user.name.slice(0, 2) : 'US'}
            </div>
            <div className="hidden lg:block text-left leading-none">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-[10px] text-slate-500 capitalize mt-0.5 truncate">
                {user?.role || 'Guest'} • {user?.identifier}
              </p>
            </div>
          </div>

          {/* Logout Button (Primary Logout spot) */}
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg border border-slate-200/80 hover:border-red-200 transition-all cursor-pointer shadow-2xs"
            title="Sign out of FaceTrack"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
