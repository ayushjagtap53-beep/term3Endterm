import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// CONCEPT: Lazy Loading
const Login = lazy(() => import('./pages/Login'));
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

// CONCEPT: Conditional Rendering (Loading State for Suspense)
const Loader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary-500"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      {/* CONCEPT: React Router implementation */}
      <Router>
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected Student Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRole="student">
                  <StudentDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Protected Admin Routes */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute allowedRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Default redirect based on auth */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
