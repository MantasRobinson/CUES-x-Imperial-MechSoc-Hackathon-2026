/**
 * Client-side mirror of the backend gamification maths.
 * Used for instant feedback before an API response arrives.
 */

const XP_PER_MINUTE = 10;
const XP_MULTIPLIERS = [
  { minMinutes: 120, multiplier: 3.0 },
  { minMinutes: 60,  multiplier: 2.0 },
  { minMinutes: 30,  multiplier: 1.5 },
];
const XP_QUIET_BONUS   = 50;
const XP_PER_LEVEL_FACTOR = 100;

export function calculateSessionXP(durationMinutes, noiseLevel) {
  const base = durationMinutes * XP_PER_MINUTE;
  const { multiplier } = XP_MULTIPLIERS.find((m) => durationMinutes > m.minMinutes) || { multiplier: 1.0 };
  let xp = Math.round(base * multiplier);
  if (noiseLevel === 'Quiet') xp += XP_QUIET_BONUS;
  return { xp, multiplier };
}

export function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) total += i * i * XP_PER_LEVEL_FACTOR;
  return total;
}

export function levelForXP(totalXp) {
  let level = 1;
  while (true) {
    if (totalXp < xpRequiredForLevel(level + 1)) break;
    level++;
  }
  return level;
}

export function levelProgress(totalXp) {
  const level          = levelForXP(totalXp);
  const currentLevelXP = xpRequiredForLevel(level);
  const nextLevelXP    = xpRequiredForLevel(level + 1);
  const progress = nextLevelXP > currentLevelXP
    ? (totalXp - currentLevelXP) / (nextLevelXP - currentLevelXP)
    : 1;
  return { level, currentLevelXP, nextLevelXP, progress };
}
