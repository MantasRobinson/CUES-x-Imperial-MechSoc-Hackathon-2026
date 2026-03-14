import React, { useEffect, useState } from 'react';
import api from '../services/api';
import LeaderboardTable from '../components/Leaderboard/LeaderboardTable';

const BOARDS = [
  { key: 'weekly-xp',       label: 'Weekly XP',       valueKey: 'weeklyXp',     unit: 'XP' },
  { key: 'all-time-hours',  label: 'All-Time Hours',   valueKey: 'totalHours',   unit: 'h'  },
  { key: 'longest-streak',  label: 'Longest Streak',   valueKey: 'currentStreak', unit: 'days' },
];

export default function LeaderboardPage() {
  const [active, setActive]   = useState('weekly-xp');
  const [rows,   setRows]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    api.get(`/leaderboard/${active}`)
      .then((r) => {
        const board = BOARDS.find((b) => b.key === active);
        const formatted = r.data.map((entry) => ({
          rank:  entry.rank,
          user:  entry.user,
          value: `${entry[board.valueKey]} ${board.unit}`,
        }));
        setRows(formatted);
      })
      .catch(() => setError('Failed to load leaderboard.'))
      .finally(() => setLoading(false));
  }, [active]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray-400 text-sm mt-1">Weekly XP resets every Monday.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 flex-wrap">
        {BOARDS.map((b) => (
          <button
            key={b.key}
            onClick={() => setActive(b.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              active === b.key
                ? 'bg-brand-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {loading ? (
        <p className="text-gray-400 animate-pulse">Loading…</p>
      ) : (
        <LeaderboardTable
          rows={rows}
          valueLabel={BOARDS.find((b) => b.key === active)?.label}
        />
      )}
    </div>
  );
}
