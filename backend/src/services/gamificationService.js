/**
 * gamificationService.js
 * Core XP and levelling calculations — pure functions, no DB access.
 */

const {
  XP_PER_MINUTE,
  XP_MULTIPLIERS,
  XP_QUIET_BONUS,
  XP_PER_LEVEL_FACTOR,
} = require('../config/constants');

/**
 * Calculate XP earned for a session.
 * @param {number} durationMinutes
 * @param {string} noiseLevel  'Quiet' | 'Moderate' | 'Loud'
 * @returns {{ xp: number, multiplier: number }}
 */
function calculateSessionXP(durationMinutes, noiseLevel) {
  const baseXP = durationMinutes * XP_PER_MINUTE;

  // Find the highest applicable multiplier
  const { multiplier } = XP_MULTIPLIERS.find(
    (m) => durationMinutes >= m.minMinutes
  ) || { multiplier: 1.0 };

  let xp = Math.round(baseXP * multiplier);

  if (noiseLevel === 'Quiet') {
    xp += XP_QUIET_BONUS;
  }

  return { xp, multiplier };
}

/**
 * Compute the cumulative XP required to *reach* a given level.
 * To advance from level N to N+1, N^2 * XP_PER_LEVEL_FACTOR XP is required.
 * Therefore cumulative XP to reach level L = sum_{i=1}^{L-1} i^2 * factor.
 *
 * @param {number} level  target level (>= 1)
 * @returns {number}
 */
function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += i * i * XP_PER_LEVEL_FACTOR;
  }
  return total;
}

/**
 * Derive the level for a given total XP.
 * Returns the highest level L where xpRequiredForLevel(L) <= totalXP.
 *
 * @param {number} totalXp
 * @returns {number}
 */
function levelForXP(totalXp) {
  let level = 1;
  while (true) {
    const needed = xpRequiredForLevel(level + 1);
    if (totalXp < needed) break;
    level++;
  }
  return level;
}

/**
 * XP progress within the current level (0–1 fraction).
 * @param {number} totalXp
 * @returns {{ level: number, currentLevelXP: number, nextLevelXP: number, progress: number }}
 */
function levelProgress(totalXp) {
  const level = levelForXP(totalXp);
  const currentLevelXP = xpRequiredForLevel(level);
  const nextLevelXP    = xpRequiredForLevel(level + 1);
  const progress = nextLevelXP > currentLevelXP
    ? (totalXp - currentLevelXP) / (nextLevelXP - currentLevelXP)
    : 1;
  return { level, currentLevelXP, nextLevelXP, progress };
}

module.exports = { calculateSessionXP, xpRequiredForLevel, levelForXP, levelProgress };
