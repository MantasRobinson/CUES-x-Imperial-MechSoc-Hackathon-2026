import React, { useMemo } from 'react';
import { lastNDays } from '../../utils/dateHelpers';

/**
 * GitHub-style contribution heatmap for the last 12 weeks (84 days).
 * Each cell is coloured by phone-free minutes that day.
 */
export default function StreakHeatmap({ sessions }) {
  const DAYS = 84;
  const days = lastNDays(DAYS);

  // Build map: date → total minutes
  const minutesByDay = useMemo(() => {
    const map = {};
    for (const s of sessions || []) {
      const d = new Date(s.startTime).toISOString().slice(0, 10);
      map[d] = (map[d] || 0) + s.durationMinutes;
    }
    return map;
  }, [sessions]);

  const cellColour = (minutes) => {
    if (!minutes || minutes === 0) return 'bg-gray-800';
    if (minutes < 30)  return 'bg-green-900';
    if (minutes < 60)  return 'bg-green-700';
    if (minutes < 120) return 'bg-green-500';
    return 'bg-green-300';
  };

  // Group into 7-day columns (weeks)
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <div className="card" data-testid="streak-heatmap">
      <h2 className="font-semibold text-gray-200 mb-3">Focus History</h2>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => {
              const mins = minutesByDay[day] || 0;
              return (
                <div
                  key={day}
                  title={`${day}: ${Math.round(mins)}m`}
                  className={`w-3.5 h-3.5 rounded-sm ${cellColour(mins)}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>Less</span>
        {['bg-gray-800','bg-green-900','bg-green-700','bg-green-500','bg-green-300'].map((c) => (
          <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
