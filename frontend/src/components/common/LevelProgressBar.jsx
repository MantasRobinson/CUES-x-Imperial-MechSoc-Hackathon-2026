import React from 'react';

/**
 * Horizontal XP progress bar with level labels.
 * @param {{ level: number, progress: number, currentLevelXP: number, nextLevelXP: number, totalXp: number }} props
 */
export default function LevelProgressBar({ level, progress, currentLevelXP, nextLevelXP, totalXp }) {
  const pct = Math.round((progress || 0) * 100);

  return (
    <div data-testid="level-progress-bar">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-brand-400">Level {level}</span>
        <span className="text-xs text-gray-400">
          {totalXp - currentLevelXP} / {nextLevelXP - currentLevelXP} XP
        </span>
        <span className="text-sm font-semibold text-gray-400">Level {level + 1}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className="bg-brand-500 h-3 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
