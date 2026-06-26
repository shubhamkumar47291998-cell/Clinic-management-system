import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'super_admin' | 'admin' | 'doctor' | 'staff' | 'patient'>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={spinnerContainerStyle}>
        <div style={spinnerStyle}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div style={spinnerContainerStyle}>
        <div style={spinnerStyle}></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading your profile...</p>
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    // If authenticated but role is not allowed, redirect to their role's dashboard
    switch (profile.role) {
      case 'super_admin':
        return <Navigate to="/super-admin" replace />;
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'doctor':
        return <Navigate to="/doctor" replace />;
      case 'staff':
        return <Navigate to="/staff" replace />;
      case 'patient':
        return <Navigate to="/patient" replace />;
      default:
        return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};

const spinnerContainerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  backgroundColor: 'var(--bg-primary)',
  fontFamily: 'var(--font-family)',
};

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '3px solid var(--border-color)',
  borderTop: '3px solid var(--accent-primary)',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
};
