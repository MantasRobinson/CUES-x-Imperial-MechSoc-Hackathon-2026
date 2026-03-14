import React from 'react';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

/**
 * @param {{ rows: Array<{rank, user, value}>, valueLabel: string }} props
 */
export default function LeaderboardTable({ rows, valueLabel }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="card text-center text-gray-500 py-8" data-testid="leaderboard-table">
        No data yet. Be the first on the board!
      </div>
    );
  }

  return (
    <div className="card overflow-x-auto" data-testid="leaderboard-table">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase w-12">Rank</th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-400 uppercase">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.user.id}
              className="border-b border-gray-800/50 hover:bg-gray-800/30"
            >
              <td className="px-3 py-2 text-center font-bold text-lg">
                {MEDAL[row.rank] || <span className="text-gray-400">{row.rank}</span>}
              </td>
              <td className="px-3 py-2">
                <div className="font-medium text-gray-200">{row.user.displayName}</div>
                <div className="text-xs text-gray-500">Lv {row.user.level}</div>
              </td>
              <td className="px-3 py-2 text-right font-semibold text-brand-400">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
