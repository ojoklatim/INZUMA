import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from './ui/Spinner';

export default function AuthGuard({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--accent)'
      }}>
        <Spinner size={32} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect based on actual role
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    } else if (role === 'professional') {
      return <Navigate to="/professional" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
}
