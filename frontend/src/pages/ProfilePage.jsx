import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import BadgeGrid        from '../components/Profile/BadgeGrid';
import LevelProgressBar from '../components/common/LevelProgressBar';
import { formatDuration } from '../utils/dateHelpers';

function AccountId({ id }) {
  const [copied, setCopied] = useState(false);
  if (!id) return null;
  const handleCopy = () => {
    navigator.clipboard.writeText(id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <span className="text-xs text-gray-500 font-mono truncate max-w-[200px]">{id}</span>
      <button
        onClick={handleCopy}
        title="Copy account ID"
        className="text-xs text-gray-500 hover:text-brand-400 transition-colors shrink-0"
      >
        {copied ? '✓ copied' : 'copy'}
      </button>
    </div>
  );
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

  const [profile,  setProfile]  = useState(null);
  const [editing,  setEditing]  = useState(false);
  const [form,     setForm]     = useState({ displayName: '', showOnLeaderboard: true });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get('/users/profile')
      .then((r) => {
        setProfile(r.data);
        setForm({
          displayName:       r.data.user.displayName,
          showOnLeaderboard: r.data.user.showOnLeaderboard,
        });
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/users/profile', form);
      updateUser(res.data.user);
      setProfile((p) => ({ ...p, user: res.data.user }));
      setEditing(false);
    } catch {
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-gray-400 animate-pulse">Loading…</p>;
  if (error)   return <p className="text-red-400">{error}</p>;

  const u  = profile?.user || user;
  const lp = profile?.levelProgress;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Profile header */}
      <div className="card flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-brand-700 flex items-center justify-center text-3xl font-bold text-white shrink-0">
          {u.displayName?.[0]?.toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-3">
              <input
                className="input"
                value={form.displayName}
                onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder="Display name"
                required
              />
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showOnLeaderboard}
                  onChange={(e) => setForm((f) => ({ ...f, showOnLeaderboard: e.target.checked }))}
                  className="w-4 h-4 accent-brand-500"
                />
                Show me on leaderboard
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary py-1.5 px-3 text-sm" disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" className="btn-secondary py-1.5 px-3 text-sm" onClick={() => setEditing(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div>
              <h1 className="text-xl font-bold text-white truncate">{u.displayName}</h1>
              <p className="text-sm text-gray-400">{u.email}</p>
              <AccountId id={u.id} />
              <button className="text-xs text-brand-400 mt-1 hover:underline" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: '📵', label: 'Phone-free time', value: formatDuration(u.totalPhoneFreeMinutes || 0) },
          { icon: '🔥', label: 'Best streak',     value: `${u.longestStreak || 0} days` },
          { icon: '⚡', label: 'Total XP',        value: (u.totalXp || 0).toLocaleString() },
        ].map((stat) => (
          <div key={stat.label} className="card text-center">
            <div className="text-2xl">{stat.icon}</div>
            <p className="font-bold text-white mt-1">{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Level progress */}
      {lp && (
        <div className="card">
          <LevelProgressBar
            level={lp.level}
            progress={lp.progress}
            currentLevelXP={lp.currentLevelXP}
            nextLevelXP={lp.nextLevelXP}
            totalXp={u.totalXp}
          />
        </div>
      )}

      {/* Badges */}
      <div>
        <h2 className="text-lg font-semibold text-gray-200 mb-3">
          Badges ({profile?.badges?.length || 0})
        </h2>
        <BadgeGrid badges={profile?.badges} />
      </div>
    </div>
  );
}
