import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navClass = ({ isActive }) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-700 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`;

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="text-xl font-bold text-brand-400 tracking-tight">
          📦 PhoneBox
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <NavLink to="/dashboard"   className={navClass}>Dashboard</NavLink>
          <NavLink to="/leaderboard" className={navClass}>Leaderboard</NavLink>
          <NavLink to="/profile"     className={navClass}>Profile</NavLink>
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:block">
            Lv {user?.level} · {user?.displayName}
          </span>
          <button onClick={handleLogout} className="btn-secondary text-sm py-1.5 px-3">
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
