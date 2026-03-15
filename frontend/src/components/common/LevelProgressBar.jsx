import { useEffect, useState } from 'react';

/**
 * Horizontal XP progress bar with level labels.
 * Animates from 0 on first render and smoothly fills to the new value on updates.
 * @param {{ level: number, progress: number, currentLevelXP: number, nextLevelXP: number, totalXp: number }} props
 */
export default function LevelProgressBar({ level, progress, currentLevelXP, nextLevelXP, totalXp }) {
  const targetPct = Math.round((progress || 0) * 100);
  const [displayPct, setDisplayPct] = useState(0);
  const [glowing,    setGlowing]    = useState(false);

  useEffect(() => {
    setGlowing(true);
    const fill = setTimeout(() => setDisplayPct(targetPct), 80);
    const glow = setTimeout(() => setGlowing(false), 1800);
    return () => { clearTimeout(fill); clearTimeout(glow); };
  }, [targetPct]);

  return (
    <div data-testid="level-progress-bar">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-semibold text-brand-400">Level {level}</span>
        <span className="text-xs text-gray-400">
          {totalXp - currentLevelXP} / {nextLevelXP - currentLevelXP} XP
        </span>
        <span className="text-sm font-semibold text-gray-400">Level {level + 1}</span>
      </div>
      {/* Outer wrapper carries the glow so overflow-hidden on the track doesn't clip it */}
      <div
        className="rounded-full transition-shadow duration-700"
        style={glowing ? { boxShadow: '0 0 12px 3px rgba(59,130,246,0.45)' } : {}}
      >
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-brand-500 h-3 rounded-full transition-all duration-[1400ms] ease-out"
            style={{ width: `${displayPct}%` }}
            role="progressbar"
            aria-valuenow={displayPct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </div>
  );
}
