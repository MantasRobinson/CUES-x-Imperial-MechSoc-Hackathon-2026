import React from 'react';
import { formatDuration } from '../../utils/dateHelpers';

/**
 * Four stat cards at the top of the dashboard.
 */
export default function SummaryCards({ todayMinutes, todayXP, currentStreak, level, levelProgress }) {
  const cards = [
    {
      label:  "Today's focus time",
      value:  formatDuration(todayMinutes || 0),
      icon:   '📵',
      colour: 'text-green-400',
    },
    {
      label:  'XP earned today',
      value:  `${todayXP || 0} XP`,
      icon:   '⚡',
      colour: 'text-yellow-400',
    },
    {
      label:  'Current streak',
      value:  `${currentStreak || 0} ${(currentStreak || 0) === 1 ? 'day' : 'days'}`,
      icon:   '🔥',
      colour: 'text-orange-400',
    },
    {
      label:  'Level',
      value:  `${level || 1}`,
      icon:   '🏆',
      colour: 'text-brand-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="summary-cards">
      {cards.map((card) => (
        <div key={card.label} className="card flex flex-col gap-1">
          <span className="text-2xl">{card.icon}</span>
          <p className={`text-2xl font-bold ${card.colour}`}>{card.value}</p>
          <p className="text-xs text-gray-400">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
