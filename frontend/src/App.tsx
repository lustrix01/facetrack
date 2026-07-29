import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import FacultyDashboardPage from './pages/FacultyDashboardPage';
import FacultyClassesPage from './pages/FacultyClassesPage';
import FacultySessionsPage from './pages/FacultySessionsPage';
import FacultyHistoryPage from './pages/FacultyHistoryPage';
import FacultyProfilePage from './pages/FacultyProfilePage';
import StudentDashboardPage from './pages/StudentDashboardPage';
import StudentAttendancePage from './pages/StudentAttendancePage';
import StudentHistoryPage from './pages/StudentHistoryPage';
import StudentFaceEnrollmentPage from './pages/StudentFaceEnrollmentPage';
import StudentProfilePage from './pages/StudentProfilePage';
import DashboardPage from './pages/DashboardPage';

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    if (user?.role === 'faculty') {
      switch (activeTab) {
        case 'dashboard':
          return <FacultyDashboardPage />;
        case 'classes':
          return <FacultyClassesPage />;
        case 'sessions':
          return <FacultySessionsPage />;
        case 'history':
          return <FacultyHistoryPage />;
        case 'profile':
          return <FacultyProfilePage />;
        default:
          return <FacultyDashboardPage />;
      }
    }

    if (user?.role === 'student') {
      switch (activeTab) {
        case 'dashboard':
          return <StudentDashboardPage />;
        case 'attendance':
          return <StudentAttendancePage />;
        case 'history':
          return <StudentHistoryPage />;
        case 'enrollment':
          return <StudentFaceEnrollmentPage />;
        case 'profile':
          return <StudentProfilePage />;
        default:
          return <StudentDashboardPage />;
      }
    }

    // Default dashboard for other roles
    return <DashboardPage />;
  };

  return (
    <MainLayout activeTab={activeTab} onSelectTab={(tab) => setActiveTab(tab)}>
      {renderContent()}
    </MainLayout>
  );
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ProtectedRoute>
          <AppContent />
        </ProtectedRoute>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
