/**
 * seedMockData.js — populate realistic demo users, sessions, and badges.
 * Run with: npm run seed:mock
 *
 * Wipes all users, sessions, user_badges, and user_challenges first,
 * then recreates them. Badges and challenges are left intact (run
 * `npm run seed` first if they don't exist yet).
 *
 * Demo password for all accounts: Password1!
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const { sequelize, User, Session, Badge, UserBadge, Challenge, UserChallenge } = require('../models');
const { calculateSessionXP, levelForXP } = require('../services/gamificationService');

// ── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

/** Return a Date n days ago at the given hour:minute. */
function daysAgoAt(n, hour = 10, minute = 0) {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** YYYY-MM-DD string for a Date. */
function dateStr(d) {
  return new Date(d).toISOString().slice(0, 10);
}

/**
 * Build session row objects for a user from a compact template array.
 * Each template entry: { daysAgo, startHour?, durationMinutes, noiseLevel?, disturbanceCount? }
 */
function buildSessions(userId, template) {
  return template.map(({ daysAgo, startHour = 10, durationMinutes, noiseLevel = 'Moderate', disturbanceCount = 0 }) => {
    const startTime = daysAgoAt(daysAgo, startHour);
    const endTime   = new Date(startTime.getTime() + durationMinutes * 60_000);
    const { xp, multiplier } = calculateSessionXP(durationMinutes, noiseLevel);
    return { userId, startTime, endTime, durationMinutes, noiseLevel, disturbanceCount, xpEarned: xp, multiplier };
  });
}

/**
 * Compute currentStreak, longestStreak, and lastSessionDate from an array
 * of session startTime Dates (only sessions >= 15 min count toward streak).
 */
function computeStreaks(qualifyingStartTimes) {
  if (qualifyingStartTimes.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastSessionDate: null };
  }

  const dateSet = new Set(qualifyingStartTimes.map(dateStr));
  const sorted  = [...dateSet].sort(); // ascending YYYY-MM-DD strings

  // Longest streak: scan sorted unique days
  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = Math.round((curr - prev) / 86_400_000);
    if (diff === 1) {
      run++;
      longestStreak = Math.max(longestStreak, run);
    } else {
      run = 1;
    }
  }

  // Current streak: consecutive days ending today or yesterday
  let currentStreak = 0;
  let checkDate = new Date(TODAY);
  if (!dateSet.has(dateStr(checkDate))) {
    checkDate.setDate(checkDate.getDate() - 1);
  }
  while (dateSet.has(dateStr(checkDate))) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
    lastSessionDate: sorted[sorted.length - 1],
  };
}

/**
 * Return which badges a user qualifies for given their sessions and stats.
 * Mirrors the logic in badgeService.js but runs over the local data arrays.
 */
function resolveBadges(allBadges, sessions, userStats) {
  const quietCount    = sessions.filter(s => s.noiseLevel === 'Quiet').length;
  const loudCount     = sessions.filter(s => s.noiseLevel === 'Loud').length;
  const zeroDist      = sessions.filter(s => s.disturbanceCount === 0).length;
  const totalMinutes  = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const maxDuration   = sessions.reduce((acc, s) => Math.max(acc, s.durationMinutes), 0);
  const hasNight      = sessions.some(s => { const h = new Date(s.startTime).getHours(); return h >= 22 || h < 6; });

  return allBadges.filter(badge => {
    switch (badge.criteriaType) {
      case 'first_session':              return sessions.length >= 1;
      case 'session_duration_gte':       return maxDuration >= badge.criteriaValue;
      case 'total_phone_free_hours':     return totalMinutes / 60 >= badge.criteriaValue;
      case 'streak_days':                return userStats.longestStreak >= badge.criteriaValue;
      case 'quiet_sessions':             return quietCount >= badge.criteriaValue;
      case 'noisy_sessions':             return loudCount >= badge.criteriaValue;
      case 'level':                      return userStats.level >= badge.criteriaValue;
      case 'zero_disturbance_sessions':  return zeroDist >= badge.criteriaValue;
      case 'night_session':              return hasNight;
      case 'marathon_session':           return maxDuration >= badge.criteriaValue;
      default:                           return false;
    }
  });
}

// ── Session templates ─────────────────────────────────────────────────────────
// Each entry: { daysAgo, startHour, durationMinutes, noiseLevel, disturbanceCount }

/** Alice Chen — top performer, 14-day streak, 84 days of history */
const ALICE_SESSIONS = [
  // --- last 14 days (unbroken streak) ---
  { daysAgo: 0,  startHour: 9,  durationMinutes: 75,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 1,  startHour: 10, durationMinutes: 90,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 1,  startHour: 15, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 2,  startHour: 9,  durationMinutes: 120, noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 3,  startHour: 11, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 4,  startHour: 9,  durationMinutes: 90,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 5,  startHour: 10, durationMinutes: 45,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 6,  startHour: 9,  durationMinutes: 185, noiseLevel: 'Quiet',    disturbanceCount: 0 }, // Marathon!
  { daysAgo: 7,  startHour: 14, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 0 },
  { daysAgo: 8,  startHour: 9,  durationMinutes: 75,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 9,  startHour: 11, durationMinutes: 90,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 10, startHour: 9,  durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 11, startHour: 10, durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 12, startHour: 9,  durationMinutes: 75,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 13, startHour: 11, durationMinutes: 90,  noiseLevel: 'Moderate', disturbanceCount: 0 },
  // --- weeks 3–4 ---
  { daysAgo: 15, startHour: 9,  durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 16, startHour: 10, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 17, startHour: 9,  durationMinutes: 75,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 18, startHour: 14, durationMinutes: 90,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 20, startHour: 9,  durationMinutes: 60,  noiseLevel: 'Loud',     disturbanceCount: 5 },
  { daysAgo: 21, startHour: 10, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 0 },
  { daysAgo: 22, startHour: 9,  durationMinutes: 30,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 23, startHour: 22, durationMinutes: 50,  noiseLevel: 'Quiet',    disturbanceCount: 0 }, // Night Owl!
  { daysAgo: 24, startHour: 9,  durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 25, startHour: 10, durationMinutes: 75,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 27, startHour: 9,  durationMinutes: 45,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  // --- weeks 5–8 ---
  { daysAgo: 29, startHour: 10, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 0 },
  { daysAgo: 30, startHour: 9,  durationMinutes: 90,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 32, startHour: 11, durationMinutes: 45,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 33, startHour: 9,  durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 35, startHour: 10, durationMinutes: 75,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 36, startHour: 9,  durationMinutes: 90,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 38, startHour: 14, durationMinutes: 45,  noiseLevel: 'Loud',     disturbanceCount: 3 },
  { daysAgo: 39, startHour: 9,  durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 41, startHour: 10, durationMinutes: 75,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 43, startHour: 9,  durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  // --- weeks 9–12 ---
  { daysAgo: 50, startHour: 10, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 0 },
  { daysAgo: 52, startHour: 9,  durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 55, startHour: 11, durationMinutes: 90,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 57, startHour: 9,  durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 60, startHour: 10, durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 63, startHour: 9,  durationMinutes: 75,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 66, startHour: 11, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 0 },
  { daysAgo: 70, startHour: 9,  durationMinutes: 45,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 75, startHour: 10, durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 80, startHour: 9,  durationMinutes: 75,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 83, startHour: 10, durationMinutes: 45,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
];

/** Bob Patel — second on leaderboard, prefers afternoons, noisy environments */
const BOB_SESSIONS = [
  { daysAgo: 0,  startHour: 14, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 1,  startHour: 11, durationMinutes: 45,  noiseLevel: 'Loud',     disturbanceCount: 4 },
  { daysAgo: 2,  startHour: 13, durationMinutes: 75,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 4,  startHour: 10, durationMinutes: 90,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 5,  startHour: 14, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 7,  startHour: 11, durationMinutes: 45,  noiseLevel: 'Loud',     disturbanceCount: 5 },
  { daysAgo: 9,  startHour: 13, durationMinutes: 30,  noiseLevel: 'Moderate', disturbanceCount: 0 },
  { daysAgo: 10, startHour: 10, durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 12, startHour: 14, durationMinutes: 75,  noiseLevel: 'Moderate', disturbanceCount: 3 },
  { daysAgo: 14, startHour: 11, durationMinutes: 90,  noiseLevel: 'Loud',     disturbanceCount: 6 },
  { daysAgo: 16, startHour: 13, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 18, startHour: 10, durationMinutes: 45,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 21, startHour: 14, durationMinutes: 60,  noiseLevel: 'Loud',     disturbanceCount: 4 },
  { daysAgo: 23, startHour: 11, durationMinutes: 75,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 25, startHour: 13, durationMinutes: 45,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 28, startHour: 10, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 30, startHour: 14, durationMinutes: 90,  noiseLevel: 'Loud',     disturbanceCount: 5 },
  { daysAgo: 33, startHour: 11, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 0 },
  { daysAgo: 35, startHour: 13, durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 38, startHour: 10, durationMinutes: 75,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 42, startHour: 14, durationMinutes: 60,  noiseLevel: 'Loud',     disturbanceCount: 3 },
  { daysAgo: 45, startHour: 11, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 50, startHour: 13, durationMinutes: 30,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 55, startHour: 10, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 60, startHour: 14, durationMinutes: 75,  noiseLevel: 'Loud',     disturbanceCount: 4 },
  { daysAgo: 65, startHour: 11, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 0 },
  { daysAgo: 70, startHour: 13, durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 75, startHour: 10, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 1 },
];

/** Charlie Kim — newcomer, just started two weeks ago, short sessions */
const CHARLIE_SESSIONS = [
  { daysAgo: 0,  startHour: 15, durationMinutes: 30,  noiseLevel: 'Loud',     disturbanceCount: 3 },
  { daysAgo: 2,  startHour: 14, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 4,  startHour: 16, durationMinutes: 20,  noiseLevel: 'Loud',     disturbanceCount: 5 },
  { daysAgo: 6,  startHour: 15, durationMinutes: 35,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 8,  startHour: 14, durationMinutes: 60,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
  { daysAgo: 10, startHour: 16, durationMinutes: 25,  noiseLevel: 'Loud',     disturbanceCount: 4 },
  { daysAgo: 12, startHour: 15, durationMinutes: 40,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 13, startHour: 14, durationMinutes: 30,  noiseLevel: 'Quiet',    disturbanceCount: 0 },
];

/** Diana Osei — silent library queen, consistent morning sessions, 10+ quiet sessions */
const DIANA_SESSIONS = [
  { daysAgo: 0,  startHour: 8, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 1,  startHour: 8, durationMinutes: 75,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 2,  startHour: 9, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 3,  startHour: 8, durationMinutes: 45,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 5,  startHour: 8, durationMinutes: 90,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 6,  startHour: 9, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 7,  startHour: 8, durationMinutes: 75,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 9,  startHour: 8, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 10, startHour: 9, durationMinutes: 45,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 11, startHour: 8, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 12, startHour: 8, durationMinutes: 75,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 14, startHour: 9, durationMinutes: 90,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 16, startHour: 8, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 18, startHour: 8, durationMinutes: 45,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 21, startHour: 9, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 23, startHour: 8, durationMinutes: 75,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 25, startHour: 8, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 28, startHour: 9, durationMinutes: 45,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 30, startHour: 8, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 35, startHour: 8, durationMinutes: 75,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 40, startHour: 9, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 45, startHour: 8, durationMinutes: 45,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 50, startHour: 8, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 55, startHour: 9, durationMinutes: 75,  noiseLevel: 'Quiet', disturbanceCount: 0 },
  { daysAgo: 60, startHour: 8, durationMinutes: 60,  noiseLevel: 'Quiet', disturbanceCount: 0 },
];

/** Eve Rossi — studies in busy cafes, high disturbances, earns Socialite Stopper */
const EVE_SESSIONS = [
  { daysAgo: 0,  startHour: 12, durationMinutes: 30,  noiseLevel: 'Loud',     disturbanceCount: 6 },
  { daysAgo: 1,  startHour: 13, durationMinutes: 45,  noiseLevel: 'Loud',     disturbanceCount: 8 },
  { daysAgo: 3,  startHour: 12, durationMinutes: 30,  noiseLevel: 'Loud',     disturbanceCount: 5 },
  { daysAgo: 5,  startHour: 13, durationMinutes: 60,  noiseLevel: 'Moderate', disturbanceCount: 3 },
  { daysAgo: 7,  startHour: 12, durationMinutes: 45,  noiseLevel: 'Loud',     disturbanceCount: 7 },
  { daysAgo: 9,  startHour: 13, durationMinutes: 30,  noiseLevel: 'Loud',     disturbanceCount: 4 },
  { daysAgo: 11, startHour: 12, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 14, startHour: 13, durationMinutes: 60,  noiseLevel: 'Loud',     disturbanceCount: 9 },
  { daysAgo: 17, startHour: 12, durationMinutes: 30,  noiseLevel: 'Loud',     disturbanceCount: 5 },
  { daysAgo: 20, startHour: 13, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 2 },
  { daysAgo: 25, startHour: 12, durationMinutes: 30,  noiseLevel: 'Loud',     disturbanceCount: 6 },
  { daysAgo: 30, startHour: 13, durationMinutes: 60,  noiseLevel: 'Loud',     disturbanceCount: 4 },
  { daysAgo: 40, startHour: 12, durationMinutes: 45,  noiseLevel: 'Moderate', disturbanceCount: 1 },
  { daysAgo: 50, startHour: 13, durationMinutes: 30,  noiseLevel: 'Loud',     disturbanceCount: 7 },
];

// ── Main seed ─────────────────────────────────────────────────────────────────

async function seed() {
  await sequelize.sync({ alter: true });
  console.log('DB synced.\n');

  const badges    = await Badge.findAll();
  const challenges = await Challenge.findAll();

  if (badges.length === 0) {
    console.error('No badges found — run `npm run seed` first to create badges and challenges.');
    process.exit(1);
  }

  // Clear all user-related data (cascade deletes sessions/badges/challenges too)
  await UserChallenge.destroy({ truncate: true, cascade: true });
  await UserBadge.destroy({ truncate: true, cascade: true });
  await Session.destroy({ truncate: true, cascade: true });
  await User.destroy({ truncate: true, cascade: true });
  console.log('Cleared existing user data.\n');

  const DEMO_PASSWORD  = 'Password1!';
  const passwordHash   = await bcrypt.hash(DEMO_PASSWORD, 12);

  const STREAK_QUALIFYING_MINUTES = 15; // must match STREAK_MIN_SESSION_MINUTES

  const userDefs = [
    { email: 'alice@demo.com',   displayName: 'Alice Chen',   template: ALICE_SESSIONS },
    { email: 'bob@demo.com',     displayName: 'Bob Patel',    template: BOB_SESSIONS   },
    { email: 'charlie@demo.com', displayName: 'Charlie Kim',  template: CHARLIE_SESSIONS },
    { email: 'diana@demo.com',   displayName: 'Diana Osei',   template: DIANA_SESSIONS },
    { email: 'eve@demo.com',     displayName: 'Eve Rossi',    template: EVE_SESSIONS   },
  ];

  for (const def of userDefs) {
    // Build session objects with a placeholder userId — replaced after User.create
    const sessions = buildSessions('__placeholder__', def.template);

    // Derive user-level stats from sessions
    const totalXp              = sessions.reduce((acc, s) => acc + s.xpEarned, 0);
    const totalPhoneFreeMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
    const level                = levelForXP(totalXp);

    const qualifyingTimes = sessions
      .filter(s => s.durationMinutes >= STREAK_QUALIFYING_MINUTES)
      .map(s => s.startTime);
    const { currentStreak, longestStreak, lastSessionDate } = computeStreaks(qualifyingTimes);
    const streakFreezes = Math.floor(longestStreak / 7);

    const user = await User.create({
      email: def.email,
      passwordHash,
      displayName: def.displayName,
      totalXp,
      level,
      currentStreak,
      longestStreak,
      streakFreezes,
      lastSessionDate,
      totalPhoneFreeMinutes,
      showOnLeaderboard: true,
    });

    console.log(`👤 ${user.displayName}`);
    console.log(`   Level ${level} · ${totalXp} XP · streak ${currentStreak} (longest ${longestStreak})`);

    // Insert sessions with the real userId
    for (const sess of sessions) {
      await Session.create({ ...sess, userId: user.id });
    }
    console.log(`   ${sessions.length} sessions inserted`);

    // Award badges
    const earned = resolveBadges(badges, sessions, { level, longestStreak });
    for (const badge of earned) {
      await UserBadge.create({ userId: user.id, badgeId: badge.id });
    }
    if (earned.length > 0) {
      console.log(`   Badges: ${earned.map(b => `${b.iconEmoji} ${b.name}`).join(', ')}`);
    }

    // Join all currently-active challenges with realistic partial progress
    const now = new Date();
    for (const ch of challenges) {
      const endsAt = new Date(ch.endsAt);
      endsAt.setHours(23, 59, 59, 999);
      if (endsAt < now) continue; // skip expired challenges

      const maxProgress = ch.criteriaValue;
      const progress    = Math.round(maxProgress * (0.1 + Math.random() * 0.7));
      const completed   = progress >= maxProgress;
      await UserChallenge.create({
        userId: user.id,
        challengeId: ch.id,
        progress,
        completed,
        completedAt: completed ? new Date() : null,
      });
    }

    console.log('');
  }

  console.log('─'.repeat(50));
  console.log('Mock data seed complete!');
  console.log('');
  console.log('Demo accounts (password: Password1!)');
  console.log('  alice@demo.com   — top performer, long history');
  console.log('  bob@demo.com     — café/library mix');
  console.log('  charlie@demo.com — newcomer');
  console.log('  diana@demo.com   — silent library sessions');
  console.log('  eve@demo.com     — noisy environment specialist');

  await sequelize.close();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
