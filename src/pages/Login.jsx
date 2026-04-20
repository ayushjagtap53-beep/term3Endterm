import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Utensils, LogIn, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Login = () => {
  // CONCEPT: useState (Local component state)
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // CONCEPT: useRef (Manage DOM focus)
  const emailRef = useRef(null);

  const { login, signup, currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      if (userRole === 'admin') navigate('/admin');
      else if (userRole === 'student') navigate('/dashboard');
    }
  }, [currentUser, userRole, navigate]);

  // Focus email on mount or toggle
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.focus();
    }
  }, [isLogin]);

  // CONCEPT: Controlled Components (form handler)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
        // Navigation handled by the useEffect above
      } else {
        await signup(email, password, role);
      }
    } catch (err) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-primary-50 to-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center flex-col items-center">
          <div className="bg-primary-500 rounded-full p-4 shadow-xl mb-4">
            <Utensils className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900 tracking-tight">
            Smart Mess System
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Feedback & Food Wastage Reduction
          </p>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="bg-white py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-gray-100">
          
          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                isLogin ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`pb-2 px-1 text-sm font-medium transition-colors ${
                !isLogin ? 'border-b-2 border-primary-500 text-primary-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Create Account
            </button>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm font-medium text-center border border-red-100"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <div className="mt-1">
                <input
                  ref={emailRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-shadow transition-colors text-sm"
                  placeholder="name@institute.edu"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 transition-shadow transition-colors text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* CONCEPT: Conditional Rendering (Role selection only shown on signup) */}
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-2"
              >
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div 
                    onClick={() => setRole('student')}
                    className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center transition-all ${
                      role === 'student' ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium mt-1">Student</span>
                  </div>
                  <div 
                    onClick={() => setRole('admin')}
                    className={`cursor-pointer rounded-xl border p-4 flex flex-col items-center transition-all ${
                      role === 'admin' ? 'bg-primary-50 border-primary-500 ring-1 ring-primary-500' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-sm font-medium mt-1">Admin</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : isLogin ? (
                  <span className="flex items-center"><LogIn className="w-4 h-4 mr-2"/> Sign in</span>
                ) : (
                  <span className="flex items-center"><UserPlus className="w-4 h-4 mr-2"/> Create Account</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
