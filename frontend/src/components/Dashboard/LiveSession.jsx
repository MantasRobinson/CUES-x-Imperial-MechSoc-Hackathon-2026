import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { calculateSessionXP, levelProgress } from '../../utils/xpCalculator';

const POLL_MS  = 3000;
const FLASH_MS = 4500;

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

// XP bar that animates from pre-session to post-session progress
function CompletionXPBar({ prevLp, nextLp }) {
  const levellingUp = nextLp.level > prevLp.level;
  const startPct    = Math.min(100, prevLp.progress * 100);
  const targetPct   = levellingUp ? 100 : Math.min(100, nextLp.progress * 100);
  const [displayPct, setDisplayPct] = useState(startPct);

  useEffect(() => {
    const t = setTimeout(() => setDisplayPct(targetPct), 300);
    return () => clearTimeout(t);
  }, [targetPct]);

  return (
    <div className="w-full max-w-sm space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className={levellingUp ? 'text-yellow-400 font-semibold' : 'text-gray-500'}>
          Level {nextLp.level}{levellingUp ? ' 🎉 Level up!' : ''}
        </span>
        <span className="text-gray-600">→ Level {nextLp.level + (levellingUp ? 0 : 1)}</span>
      </div>
      <div className="relative w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
        {/* Pre-session position (dim) */}
        <div className="absolute h-2.5 rounded-full bg-gray-600"
          style={{ width: `${startPct.toFixed(1)}%` }} />
        {/* Animated fill to new position */}
        <div className="h-2.5 rounded-full bg-brand-500 transition-all duration-[1400ms] ease-out"
          style={{ width: `${displayPct.toFixed(1)}%` }} />
      </div>
    </div>
  );
}

// Animated sound-wave bars (decorative, visualises that noise is being monitored)
const BAR_HEIGHTS = [3, 5, 7, 4, 8, 6, 9, 5, 7, 4, 6, 3, 8, 5, 4];
function SoundBars() {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex items-end gap-1">
        {BAR_HEIGHTS.map((h, i) => (
          <div key={i}
            className="w-1.5 rounded-full bg-green-400/50 animate-pulse"
            style={{
              height: `${h * 3}px`,
              animationDelay: `${i * 80}ms`,
              animationDuration: `${600 + (i % 5) * 150}ms`,
            }}
          />
        ))}
      </div>
      <p className="text-xs text-gray-600">Monitoring environment</p>
    </div>
  );
}

export default function LiveSession({ userId, userXp, challenges, onSessionEnd }) {
  const [active,          setActive]          = useState(false);
  const [startedAt,       setStartedAt]       = useState(null);
  const [elapsed,         setElapsed]         = useState(0);
  const [completing,      setCompleting]      = useState(false);
  const [completingStats, setCompletingStats] = useState(null);
  const wasActive  = useRef(false);
  const elapsedRef = useRef(0);

  // ── Poll backend ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const poll = async () => {
      try {
        const { data } = await api.get(`/sessions/active/${userId}`);
        if (!data.active && wasActive.current) {
          const finalSec = elapsedRef.current;
          const finalMin = finalSec / 60;
          const { xp, multiplier } = calculateSessionXP(finalMin, 'Moderate');
          const mm = String(Math.floor(finalSec / 60)).padStart(2, '0');
          const ss = String(finalSec % 60).padStart(2, '0');
          const prevLp = userXp != null ? levelProgress(userXp)       : null;
          const nextLp = userXp != null ? levelProgress(userXp + xp)  : null;
          const completedQuests = nearbyQuests(challenges, finalMin)
            .filter(ch => ch.projected >= ch.criteriaValue);
          setCompletingStats({ timeStr: `${mm}:${ss}`, xp, multiplier, prevLp, nextLp, completedQuests });
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
    if (!active || !startedAt) { setElapsed(0); elapsedRef.current = 0; return; }
    const origin = new Date(startedAt).getTime();
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - origin) / 1000);
      setElapsed(s);
      elapsedRef.current = s;
    }, 1000);
    return () => clearInterval(id);
  }, [active, startedAt]);

  if (!active && !completing) return null;

  // ── Completion card ─────────────────────────────────────────────────────────
  if (completing) {
    const s = completingStats;
    return (
      <div className="rounded-2xl bg-gray-900 border border-green-500/40 p-8 flex flex-col items-center gap-5">
        <div className="text-5xl">✅</div>
        <p className="text-green-400 font-bold text-xl tracking-wide">Session Complete!</p>

        {s && (
          <>
            {/* Duration + XP */}
            <div className="flex items-center gap-8">
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-3xl font-mono font-bold text-white tabular-nums">{s.timeStr}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wide">Duration</span>
              </div>
              <div className="w-px h-10 bg-gray-700" />
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-3xl font-bold text-yellow-400">+{s.xp}</span>
                <span className="text-xs text-gray-500 uppercase tracking-wide">XP Earned</span>
                {s.multiplier > 1 && (
                  <span className="text-xs text-yellow-300 font-semibold">{s.multiplier}× multiplier</span>
                )}
              </div>
            </div>

            {/* Animated XP bar */}
            {s.prevLp && s.nextLp && (
              <CompletionXPBar prevLp={s.prevLp} nextLp={s.nextLp} />
            )}

            {/* Completed challenges */}
            {s.completedQuests?.length > 0 && (
              <div className="w-full max-w-sm space-y-2 pt-3 border-t border-gray-800">
                <p className="text-xs text-gray-600 font-medium uppercase tracking-wide text-center">
                  Challenges Completed
                </p>
                {s.completedQuests.map(ch => (
                  <div key={ch.id} className="flex justify-between items-center bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                    <span className="text-sm text-green-400 font-medium">✅ {ch.title}</span>
                    <span className="text-xs text-yellow-400 font-semibold">+{ch.xpReward} XP</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p className="text-gray-600 text-xs">Uploading results…</p>
      </div>
    );
  }

  // ── Live session card ───────────────────────────────────────────────────────
  const mm          = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss          = String(elapsed % 60).padStart(2, '0');
  const elapsedMin  = elapsed / 60;
  const { xp, multiplier } = calculateSessionXP(elapsedMin, 'Moderate');
  const milestone   = nextMilestone(elapsedMin);
  const quests      = nearbyQuests(challenges, elapsedMin);

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

        {/* Sound-wave visualisation */}
        <SoundBars />

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
              <div className="absolute h-1.5 rounded-full bg-gray-600"
                style={{ width: `${(prevLp.progress * 100).toFixed(1)}%` }} />
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
              const pct     = Math.min(100, (ch.projected / ch.criteriaValue) * 100);
              const prevPct = Math.min(100, (ch.progress  / ch.criteriaValue) * 100);
              const done    = ch.projected >= ch.criteriaValue;
              return (
                <div key={ch.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={done ? 'text-green-400 font-semibold' : 'text-gray-500'}>
                      {done ? '✅ ' : ''}{ch.title}
                    </span>
                    <span className="text-gray-600">+{ch.xpReward} XP</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden relative">
                    <div className="absolute h-1.5 rounded-full bg-gray-600"
                      style={{ width: `${prevPct.toFixed(1)}%` }} />
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
