import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// CONCEPT: Protected Routes Implementation
// CONCEPT: Conditional Rendering (Role-based access)
const ProtectedRoute = ({ children, allowedRole }) => {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If role is required and exists, but doesn't match
  if (allowedRole && userRole && userRole !== allowedRole) {
    // Redirect admins to admin, students to dashboard
    return <Navigate to={userRole === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;
