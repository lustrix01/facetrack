import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

interface MainLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onSelectTab?: (tab: string) => void;
}

const TAB_NAMES: Record<string, string> = {
  dashboard: 'Dashboard Overview',
  classes: 'Class Roster Management',
  sessions: 'Attendance Sessions',
  history: 'Attendance History Logs',
  profile: 'Profile & Security',
  attendance: 'Check-in Attendance',
  enrollment: 'Facial Enrollment',
};

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  activeTab = 'dashboard',
  onSelectTab,
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const activeTabName = TAB_NAMES[activeTab] || 'Dashboard';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        activeTabName={activeTabName}
      />

      <div className="flex flex-1 relative">
        {/* Navigation Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          activeTab={activeTab}
          onSelectTab={onSelectTab}
        />

        {/* Main Content Area */}
        <main className="flex-1 md:pl-64 min-w-0 transition-all duration-200">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
