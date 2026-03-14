import React from 'react';
import { formatDuration, formatDate } from '../../utils/dateHelpers';

export default function PersonalBests({ longestSession, longestStreak, highestXpSession }) {
  const bests = [
    {
      icon:  '⏱️',
      label: 'Longest session',
      value: longestSession ? formatDuration(longestSession.durationMinutes) : '—',
      sub:   longestSession ? formatDate(longestSession.startTime) : null,
    },
    {
      icon:  '🔥',
      label: 'Longest streak',
      value: longestStreak ? `${longestStreak} days` : '—',
    },
    {
      icon:  '⚡',
      label: 'Best session XP',
      value: highestXpSession ? `${highestXpSession.xpEarned} XP` : '—',
      sub:   highestXpSession ? formatDuration(highestXpSession.durationMinutes) : null,
    },
  ];

  return (
    <div className="card" data-testid="personal-bests">
      <h2 className="font-semibold text-gray-200 mb-3">Personal Bests</h2>
      <div className="grid grid-cols-3 gap-4">
        {bests.map((b) => (
          <div key={b.label} className="text-center">
            <div className="text-3xl mb-1">{b.icon}</div>
            <p className="text-lg font-bold text-white">{b.value}</p>
            <p className="text-xs text-gray-400">{b.label}</p>
            {b.sub && <p className="text-xs text-gray-600 mt-0.5">{b.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
