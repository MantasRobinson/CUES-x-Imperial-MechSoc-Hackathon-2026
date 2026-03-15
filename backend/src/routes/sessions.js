/**
 * POST /api/sessions  — MATLAB ingestion endpoint + user dashboard queries
 */
const express = require('express');
const { body, query } = require('express-validator');
const { Op } = require('sequelize');

const { User, Session } = require('../models');
const { validate } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');
const { calculateSessionXP } = require('../services/gamificationService');
const { levelForXP } = require('../services/gamificationService');
const { updateStreak } = require('../services/streakService');
const { checkAndAwardBadges } = require('../services/badgeService');
const { updateChallengeProgress } = require('../services/challengeService');
const { NOISE_LEVELS } = require('../config/constants');

const router = express.Router();

// In-memory store: userId → { startedAt: Date }
// Cleared automatically when the session POST arrives.
const activeSessions = new Map();

// ── GET /api/sessions/active/:userId ───────────────────────────────────────────
// Frontend polls this to show the live animation.
router.get('/active/:userId', (req, res) => {
  const entry = activeSessions.get(req.params.userId);
  if (entry) return res.json({ active: true,  startedAt: entry.startedAt });
  return res.json({ active: false, startedAt: null });
});

// ── POST /api/sessions/active ──────────────────────────────────────────────────
// MATLAB calls this when SESSION_START fires.
router.post('/active', [body('userId').isUUID()], validate, (req, res) => {
  activeSessions.set(req.body.userId, { startedAt: new Date() });
  res.json({ active: true });
});

// ── POST /api/sessions ─────────────────────────────────────────────────────────
// Called by MATLAB via webwrite().  Also usable from the front end (manual entry).
router.post(
  '/',
  [
    body('userId').isUUID(),
    body('startTime').isISO8601(),
    body('endTime').isISO8601(),
    body('durationMinutes').isFloat({ min: 0 }),
    body('disturbanceCount').optional().isInt({ min: 0 }),
    body('noiseLevel').isIn(NOISE_LEVELS),
  ],
  validate,
  async (req, res) => {
    try {
    const {
      userId,
      startTime,
      endTime,
      durationMinutes,
      disturbanceCount = 0,
      noiseLevel,
    } = req.body;

    console.log('[sessions] POST body:', { userId, durationMinutes, noiseLevel, disturbanceCount });

    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Clear the live-session indicator now that the session is complete
    activeSessions.delete(userId);

    // ── XP calculation ─────────────────────────────────────────────────────
    const { xp, multiplier } = calculateSessionXP(durationMinutes, noiseLevel);
    console.log('[sessions] xp:', xp, 'multiplier:', multiplier);

    // ── Persist session ────────────────────────────────────────────────────
    console.log('[sessions] Creating session...');
    const session = await Session.create({
      userId,
      startTime,
      endTime,
      durationMinutes,
      disturbanceCount,
      noiseLevel,
      xpEarned: xp,
      multiplier,
    });

    // ── Update user stats ──────────────────────────────────────────────────
    console.log('[sessions] Updating user stats...');
    const sessionDate = new Date(startTime).toISOString().slice(0, 10);
    const streakResult = updateStreak(
      {
        currentStreak:   user.currentStreak,
        longestStreak:   user.longestStreak,
        streakFreezes:   user.streakFreezes,
        lastSessionDate: user.lastSessionDate,
      },
      durationMinutes,
      sessionDate
    );

    const newTotalXp  = user.totalXp + xp;
    const oldLevel    = user.level;
    const newLevel    = levelForXP(newTotalXp);
    const leveledUp   = newLevel > oldLevel;

    await user.update({
      totalXp:              newTotalXp,
      level:                newLevel,
      totalPhoneFreeMinutes: user.totalPhoneFreeMinutes + Math.round(durationMinutes),
      currentStreak:        streakResult.currentStreak,
      longestStreak:        streakResult.longestStreak,
      streakFreezes:        streakResult.streakFreezes,
      lastSessionDate:      streakResult.lastSessionDate,
    });

    // ── Badge evaluation ───────────────────────────────────────────────────
    console.log('[sessions] Checking badges...');
    const stats = await getUserBadgeStats(userId);
    const newBadges = await checkAndAwardBadges(user, session, stats);

    // ── Challenge progress ─────────────────────────────────────────────────
    console.log('[sessions] Updating challenge progress...');
    const completedChallenges = await updateChallengeProgress(userId, {
      durationMinutes,
      noiseLevel,
      disturbanceCount,
    });

    console.log('[sessions] Success — xp:', xp, 'badges:', newBadges.length, 'challenges:', completedChallenges.length);
    return res.status(201).json({
      session,
      xpEarned:           xp,
      multiplier,
      newTotalXp,
      leveledUp,
      newLevel,
      streak:             streakResult.currentStreak,
      streakBroken:       streakResult.streakBroken,
      newBadges,
      completedChallenges,
    });
    } catch (err) {
      console.error('POST /api/sessions FAILED at step above ^^^');
      console.error('Error:', err.message);
      console.error('Stack:', err.stack);
      return res.status(500).json({ error: 'Failed to save session.', detail: err.message });
    }
  }
);

// ── GET /api/sessions ──────────────────────────────────────────────────────────
router.get(
  '/',
  requireAuth,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort').optional().isIn(['asc', 'desc']),
  ],
  validate,
  async (req, res) => {
    const page  = parseInt(req.query.page  || '1', 10);
    const limit = parseInt(req.query.limit || '20', 10);
    const sort  = (req.query.sort || 'desc').toUpperCase();
    const offset = (page - 1) * limit;

    const { count, rows } = await Session.findAndCountAll({
      where: { userId: req.user.id },
      order: [['startTime', sort]],
      limit,
      offset,
    });

    res.json({ sessions: rows, total: count, page, limit });
  }
);

// ── GET /api/sessions/chart-data ───────────────────────────────────────────────
router.get('/chart-data', requireAuth, async (req, res) => {
  const period = req.query.period || 'weekly'; // daily | weekly | monthly
  const userId = req.user.id;

  const since = new Date();
  if      (period === 'daily')   since.setDate(since.getDate() - 7);
  else if (period === 'weekly')  since.setDate(since.getDate() - 28);
  else                           since.setMonth(since.getMonth() - 12);

  const sessions = await Session.findAll({
    where: { userId, startTime: { [Op.gte]: since } },
    order: [['startTime', 'ASC']],
  });

  // Aggregate by date bucket
  const buckets = {};
  for (const s of sessions) {
    const key = s.startTime.toISOString().slice(0, 10);
    if (!buckets[key]) buckets[key] = { date: key, minutes: 0, xp: 0, sessions: 0, quietMinutes: 0, moderateMinutes: 0, loudMinutes: 0 };
    buckets[key].minutes  += s.durationMinutes;
    buckets[key].xp       += s.xpEarned;
    buckets[key].sessions += 1;
    const nf = s.noiseLevel === 'Quiet' ? 'quietMinutes' : s.noiseLevel === 'Loud' ? 'loudMinutes' : 'moderateMinutes';
    buckets[key][nf] += s.durationMinutes;
  }

  // Noise distribution
  const noiseCount = { Quiet: 0, Moderate: 0, Loud: 0 };
  const durationBuckets = { '0-15': 0, '15-30': 0, '30-60': 0, '60-120': 0, '120+': 0 };
  for (const s of sessions) {
    noiseCount[s.noiseLevel] = (noiseCount[s.noiseLevel] || 0) + 1;
    const d = s.durationMinutes;
    if      (d < 15)  durationBuckets['0-15']++;
    else if (d < 30)  durationBuckets['15-30']++;
    else if (d < 60)  durationBuckets['30-60']++;
    else if (d < 120) durationBuckets['60-120']++;
    else              durationBuckets['120+']++;
  }

  res.json({
    timeSeries: Object.values(buckets),
    noiseDistribution: noiseCount,
    sessionLengthHistogram: durationBuckets,
  });
});

// ── helpers ────────────────────────────────────────────────────────────────────
async function getUserBadgeStats(userId) {
  const [quietCount, noisyCount, zeroDist] = await Promise.all([
    Session.count({ where: { userId, noiseLevel: 'Quiet' } }),
    Session.count({ where: { userId, noiseLevel: 'Loud'  } }),
    Session.count({ where: { userId, disturbanceCount: 0 } }),
  ]);
  return {
    quietSessionsCount:      quietCount,
    noisySessionsCount:      noisyCount,
    zeroDisturbanceSessions: zeroDist,
  };
}

module.exports = router;
