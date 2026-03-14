import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function RegisterForm() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const [form,    setForm]    = useState({ email: '', password: '', displayName: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.displayName);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="register-form">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Display name</label>
        <input
          className="input"
          type="text"
          name="displayName"
          value={form.displayName}
          onChange={handleChange}
          placeholder="Your name"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
        <input
          className="input"
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="you@example.com"
          required
          autoComplete="email"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
        <input
          className="input"
          type="password"
          name="password"
          value={form.password}
          onChange={handleChange}
          placeholder="Min. 8 characters"
          required
          autoComplete="new-password"
        />
      </div>

      {error && <p className="text-red-400 text-sm" role="alert">{error}</p>}

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-brand-400 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
