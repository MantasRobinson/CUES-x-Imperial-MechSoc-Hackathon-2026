/**
 * streakService.js
 * Streak update logic — pure functions operating on plain data.
 */

const {
  STREAK_MIN_SESSION_MINUTES,
  STREAK_FREEZE_MILESTONE,
} = require('../config/constants');

/**
 * Compute updated streak state after a new session completes.
 *
 * @param {object} user - plain user data (currentStreak, longestStreak, streakFreezes, lastSessionDate)
 * @param {number} durationMinutes - length of the just-completed session
 * @param {string} sessionDate - YYYY-MM-DD date of the session
 * @returns {{ currentStreak, longestStreak, streakFreezes, lastSessionDate, streakBroken }}
 */
function updateStreak(user, durationMinutes, sessionDate) {
  const {
    currentStreak = 0,
    longestStreak = 0,
    streakFreezes = 0,
    lastSessionDate = null,
  } = user;

  // Session too short to count toward streak
  if (durationMinutes < STREAK_MIN_SESSION_MINUTES) {
    return { currentStreak, longestStreak, streakFreezes, lastSessionDate, streakBroken: false };
  }

  // Already logged a qualifying session today — no change
  if (lastSessionDate === sessionDate) {
    return { currentStreak, longestStreak, streakFreezes, lastSessionDate, streakBroken: false };
  }

  let newStreak = currentStreak;
  let newFreezes = streakFreezes;
  let streakBroken = false;

  if (lastSessionDate === null) {
    // First ever session
    newStreak = 1;
  } else {
    const daysDiff = daysBetween(lastSessionDate, sessionDate);

    if (daysDiff === 1) {
      // Consecutive day
      newStreak = currentStreak + 1;
    } else if (daysDiff === 2 && streakFreezes > 0) {
      // One missed day — use a freeze
      newStreak = currentStreak + 1;
      newFreezes = streakFreezes - 1;
    } else {
      // Streak broken
      newStreak = 1;
      streakBroken = true;
    }
  }

  // Award a streak freeze at every STREAK_FREEZE_MILESTONE days
  if (newStreak % STREAK_FREEZE_MILESTONE === 0) {
    newFreezes += 1;
  }

  const newLongest = Math.max(longestStreak, newStreak);

  return {
    currentStreak:   newStreak,
    longestStreak:   newLongest,
    streakFreezes:   newFreezes,
    lastSessionDate: sessionDate,
    streakBroken,
  };
}

/**
 * Number of calendar days between two YYYY-MM-DD strings.
 * @param {string} fromDate
 * @param {string} toDate
 * @returns {number}
 */
function daysBetween(fromDate, toDate) {
  const MS_PER_DAY = 86400000;
  const from = new Date(fromDate).getTime();
  const to   = new Date(toDate).getTime();
  return Math.round((to - from) / MS_PER_DAY);
}

module.exports = { updateStreak, daysBetween };
