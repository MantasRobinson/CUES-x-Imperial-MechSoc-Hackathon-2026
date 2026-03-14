import React, { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { calculateSessionXP, levelProgress } from '../../utils/xpCalculator';

const POLL_MS  = 3000;
const FLASH_MS = 2500;

// Next multiplier milestone above current elapsed minutes
function nextMilestone(minutes) {
  if (minutes <= 30)  return { at: 30,  mult: '1.5×' };
  if (minutes <= 60)  return { at: 60,  mult: '2×'   };
  if (minutes <= 120) return { at: 120, mult: '3×'   };
  return null;
}

// Challenges this session actively contributes to, closest to completion first
function nearbyQuests(challenges, elapsedMin) {
  if (!challenges?.length) return [];
  return challenges
    .filter(ch => !ch.completed && ['sessions_count', 'total_minutes', 'community_minutes'].includes(ch.criteriaType))
    .map(ch => {
      const projected = ch.criteriaType === 'sessions_count'
        ? ch.progress + 1
        : ch.progress + elapsedMin;
      return { ...ch, projected: Math.min(projected, ch.criteriaValue) };
    })
    .sort((a, b) => (b.projected / b.criteriaValue) - (a.projected / a.criteriaValue))
    .slice(0, 3);
}

export default function LiveSession({ userId, userXp, userLevel, challenges, onSessionEnd }) {
  const [active,     setActive]     = useState(false);
  const [startedAt,  setStartedAt]  = useState(null);
  const [elapsed,    setElapsed]    = useState(0);
  const [completing, setCompleting] = useState(false);
  const wasActive = useRef(false);

  // ── Poll backend ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const poll = async () => {
      try {
        const { data } = await api.get(`/sessions/active/${userId}`);
        if (!data.active && wasActive.current) {
          setCompleting(true);
          setActive(false);
          setTimeout(() => { setCompleting(false); onSessionEnd?.(); }, FLASH_MS);
        }
        wasActive.current = data.active;
        if (data.active) { setActive(true); setStartedAt(data.startedAt); }
      } catch { /* non-fatal */ }
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [userId]);

  // ── Elapsed timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active || !startedAt) { setElapsed(0); return; }
    const origin = new Date(startedAt).getTime();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - origin) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  if (!active && !completing) return null;

  if (completing) {
    return (
      <div className="rounded-2xl bg-gray-900 border border-green-500/40 p-8 flex flex-col items-center gap-3 animate-pulse">
        <div className="text-5xl">✅</div>
        <p className="text-green-400 font-bold text-xl tracking-wide">Session Complete!</p>
        <p className="text-gray-400 text-sm">Uploading results…</p>
      </div>
    );
  }

  const mm          = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss          = String(elapsed % 60).padStart(2, '0');
  const elapsedMin  = elapsed / 60;
  const { xp, multiplier } = calculateSessionXP(elapsedMin, 'Moderate');
  const milestone   = nextMilestone(elapsedMin);
  const quests      = nearbyQuests(challenges, elapsedMin);

  // Level-up progress with projected XP
  const lp          = userXp != null ? levelProgress(userXp + xp) : null;
  const prevLp      = userXp != null ? levelProgress(userXp)      : null;
  const levellingUp = lp && prevLp && lp.level > prevLp.level;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gray-900 border border-green-500/30 p-6">

      {/* Background glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, #22c55e 0%, transparent 70%)' }} />

      <div className="relative flex flex-col items-center gap-4">

        {/* Status pill */}
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-semibold tracking-widest uppercase">Focus Session Active</span>
        </div>

        {/* Pulsing rings + icon */}
        <div className="relative flex items-center justify-center w-36 h-36">
          {[0, 0.6, 1.2].map((delay, i) => (
            <span key={i} className="absolute rounded-full border-2 border-green-400/25 animate-ping"
              style={{ width: `${(i+1)*44}px`, height: `${(i+1)*44}px`, animationDuration: '2.4s', animationDelay: `${delay}s` }} />
          ))}
          <div className="relative z-10 w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center text-3xl select-none">
            📵
          </div>
        </div>

        {/* Timer */}
        <p className="text-7xl font-mono font-bold text-white tracking-tight tabular-nums">
          {mm}:{ss}
        </p>

        {/* XP earned + multiplier */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-yellow-400">+{xp} XP</span>
          {multiplier > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs font-bold">
              {multiplier}× multiplier
            </span>
          )}
        </div>

        {/* Next multiplier milestone */}
        {milestone && (
          <p className="text-gray-500 text-xs">
            {milestone.at - Math.floor(elapsedMin)} min until {milestone.mult} multiplier
          </p>
        )}

        {/* Level progress bar with projected XP */}
        {lp && (
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span className={levellingUp ? 'text-yellow-400' : ''}>
                Level {lp.level}{levellingUp ? ' 🎉 Level up!' : ''}
              </span>
              <span>{lp.currentLevelXP} → {lp.nextLevelXP} XP</span>
            </div>
            <div className="relative w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
              {/* Current progress (dim) */}
              <div className="absolute h-1.5 rounded-full bg-gray-600"
                style={{ width: `${(prevLp.progress * 100).toFixed(1)}%` }} />
              {/* Projected progress (bright) */}
              <div className="h-1.5 rounded-full bg-brand-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, lp.progress * 100).toFixed(1)}%` }} />
            </div>
          </div>
        )}

        {/* Nearby quests */}
        {quests.length > 0 && (
          <div className="w-full max-w-sm space-y-2 pt-2 border-t border-gray-800/60">
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Quests</p>
            {quests.map(ch => {
              const pct      = Math.min(100, (ch.projected / ch.criteriaValue) * 100);
              const prevPct  = Math.min(100, (ch.progress  / ch.criteriaValue) * 100);
              const done     = ch.projected >= ch.criteriaValue;
              return (
                <div key={ch.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={done ? 'text-green-400 font-semibold' : 'text-gray-500'}>
                      {done ? '✅ ' : ''}{ch.title}
                    </span>
                    <span className="text-gray-600">+{ch.xpReward} XP</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden relative">
                    {/* Previous progress */}
                    <div className="absolute h-1.5 rounded-full bg-gray-600"
                      style={{ width: `${prevPct.toFixed(1)}%` }} />
                    {/* Projected gain (bright) */}
                    <div className={`h-1.5 rounded-full transition-all duration-1000 ${done ? 'bg-green-400' : 'bg-brand-500'}`}
                      style={{ width: `${pct.toFixed(1)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-gray-600 text-xs">Remove phone for 5 s to end session</p>
      </div>
    </div>
  );
}
