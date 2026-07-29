import React from 'react';
import { useAuth } from '../context/AuthContext';
import LoginPage from '../pages/LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('faculty' | 'student')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
          <span className="text-xs font-semibold text-gray-500">Authenticating...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <LoginPage />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-lg p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-red-600 mb-2">Access Restricted</h2>
          <p className="text-xs text-gray-600 mb-4">
            Your role ({user.role}) does not have permission to view this section.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
