import React, { useMemo, useState, useRef } from 'react';
import { lastNDays } from '../../utils/dateHelpers';

const LEVEL_CLASSES = ['bg-gray-800', 'bg-green-900/70', 'bg-green-700/70', 'bg-green-500/70', 'bg-green-300/70'];

function cellColour(minutes) {
  if (!minutes) return LEVEL_CLASSES[0];
  if (minutes < 30)  return LEVEL_CLASSES[1];
  if (minutes < 60)  return LEVEL_CLASSES[2];
  if (minutes < 120) return LEVEL_CLASSES[3];
  return LEVEL_CLASSES[4];
}

function StatTile({ label, value, accent }) {
  return (
    <div className="bg-gray-800/60 rounded-xl px-4 py-3 flex flex-col gap-0.5">
      <span className={`text-xl font-bold tabular-nums ${accent ? 'text-green-400' : 'text-white'}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

/**
 * GitHub-style contribution heatmap for the last 12 weeks (84 days),
 * with a stats panel filling the right-hand space.
 */
export default function StreakHeatmap({ sessions }) {
  const DAYS = 84;
  const days = lastNDays(DAYS);

  const [tooltip, setTooltip] = useState(null); // { x, y, date, minutes, sessions }
  const containerRef = useRef(null);

  const dayData = useMemo(() => {
    const map = {};
    for (const s of sessions || []) {
      const d = new Date(s.startTime).toISOString().slice(0, 10);
      if (!map[d]) map[d] = { minutes: 0, count: 0 };
      map[d].minutes += s.durationMinutes || 0;
      map[d].count   += 1;
    }
    return map;
  }, [sessions]);

  const stats = useMemo(() => {
    const allSessions = sessions || [];
    const totalSessions = allSessions.length;
    const totalMinutes  = allSessions.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
    const bestDay       = Object.values(dayData).reduce((m, v) => Math.max(m, v.minutes), 0);

    let currentStreak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (dayData[key]) { currentStreak++; } else if (i > 0) { break; }
    }

    let longest = 0, run = 0;
    for (const day of days) {
      if (dayData[day]) { run++; longest = Math.max(longest, run); } else { run = 0; }
    }

    return { totalSessions, totalMinutes, bestDay, currentStreak, longestStreak: longest };
  }, [sessions, dayData]);

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  const handleMouseEnter = (e, day) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const data = dayData[day] || { minutes: 0, count: 0 };
    setTooltip({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top  - containerRect.top,
      day,
      minutes: data.minutes,
      count: data.count,
    });
  };

  return (
    <div className="card" data-testid="streak-heatmap">
      <h2 className="font-semibold text-gray-200 mb-4">Focus History</h2>
      <div className="flex items-start gap-6">

        {/* Heatmap + legend */}
        <div className="shrink-0 relative" ref={containerRef}>
          <div className="flex gap-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day) => {
                  const mins = dayData[day]?.minutes || 0;
                  return (
                    <div
                      key={day}
                      className={`w-3.5 h-3.5 rounded-sm cursor-pointer transition-opacity hover:opacity-100 ${cellColour(mins)}`}
                      onMouseEnter={(e) => handleMouseEnter(e, day)}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Hover tooltip */}
          {tooltip && (
            <div
              className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full"
              style={{ left: tooltip.x, top: tooltip.y - 6 }}
            >
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs whitespace-nowrap">
                <p className="text-gray-300 font-medium mb-1">{tooltip.day}</p>
                {tooltip.count > 0 ? (
                  <>
                    <p className="text-white">
                      <span className="text-green-400 font-semibold">{(tooltip.minutes / 60).toFixed(1)}h</span>
                      {' '}focused
                    </p>
                    <p className="text-gray-400">{tooltip.count} session{tooltip.count !== 1 ? 's' : ''}</p>
                  </>
                ) : (
                  <p className="text-gray-500">No sessions</p>
                )}
              </div>
              {/* Arrow */}
              <div className="flex justify-center">
                <div className="w-2 h-2 bg-gray-900 border-r border-b border-gray-700 rotate-45 -mt-1" />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
            <span>Less</span>
            {LEVEL_CLASSES.map((c) => (
              <div key={c} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
            <span>More</span>
          </div>
        </div>

        {/* Stats panel */}
        <div className="flex-1 grid grid-cols-2 gap-2 self-center">
          <StatTile label="Sessions" value={stats.totalSessions} />
          <StatTile label="Total focus" value={`${(stats.totalMinutes / 60).toFixed(1)}h`} />
          <StatTile label="Best day" value={`${(stats.bestDay / 60).toFixed(1)}h`} />
          <StatTile label="Current streak" value={`${stats.currentStreak}d`} accent />
        </div>

      </div>
    </div>
  );
}
