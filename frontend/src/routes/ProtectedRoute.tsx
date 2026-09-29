import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { user, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-500 text-xs">Authenticating session...</div>
      </div>
    );
  }

  if (!user) {
    if (allowedRoles && (allowedRoles.includes('OFFICER') || allowedRoles.includes('ADMIN'))) {
      return <Navigate to="/officer/login" state={{ from: location }} replace />;
    }
    return <Navigate to="/applicant/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // If applicant tries to access officer, redirect to applicant dashboard
    if (role === 'APPLICANT') {
      return <Navigate to="/applicant/dashboard" replace />;
    }
    return <Navigate to="/officer/dashboard" replace />;
  }

  return <>{children}</>;
};
