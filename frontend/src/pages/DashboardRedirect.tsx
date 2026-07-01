import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const DashboardRedirect: React.FC = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p style={{ marginTop: '1rem' }}>Setting up profile...</p>
      </div>
    );
  }

  switch (profile.role) {
    case 'super_admin':
      return <Navigate to="/super-admin" replace />;
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'doctor':
      return <Navigate to="/doctor" replace />;
    case 'receptionist':
    case 'staff':
      return <Navigate to="/staff" replace />;
    case 'nurse':
      return <Navigate to="/nurse" replace />;
    case 'patient':
      return <Navigate to="/patient" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
};
