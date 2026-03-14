import React from 'react';
import { Navigate } from 'react-router-dom';
import LoginForm from '../components/Auth/LoginForm';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user)    return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="text-5xl">📦</span>
          <h1 className="text-3xl font-bold mt-3 text-white">PhoneBox</h1>
          <p className="text-gray-400 mt-1 text-sm">Focus. Level up. Repeat.</p>
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold mb-5">Sign in</h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
