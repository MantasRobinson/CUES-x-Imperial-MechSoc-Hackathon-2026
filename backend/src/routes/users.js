const express = require('express');
const { body } = require('express-validator');
const { Op } = require('sequelize');

const { User, Session, Badge, UserBadge } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { levelProgress } = require('../services/gamificationService');

const router = express.Router();

// ── GET /api/users/profile ─────────────────────────────────────────────────────
router.get('/profile', requireAuth, async (req, res) => {
  const user = req.user;

  const userBadges = await UserBadge.findAll({
    where: { userId: user.id },
    include: [{ model: Badge, as: 'badge' }],
    order: [['earned_at', 'DESC']],
  });

  const progress = levelProgress(user.totalXp);

  res.json({
    user: safeUser(user),
    levelProgress: progress,
    badges: userBadges.map((ub) => ({ ...ub.badge.toJSON(), earnedAt: ub.earnedAt })),
  });
});

// ── PATCH /api/users/profile ───────────────────────────────────────────────────
router.patch(
  '/profile',
  requireAuth,
  [
    body('displayName').optional().trim().isLength({ min: 1, max: 80 }),
    body('avatarUrl').optional().isURL(),
    body('showOnLeaderboard').optional().isBoolean(),
    body('targetMinutes').optional().isInt({ min: 0, max: 480 }),
  ],
  validate,
  async (req, res) => {
    const { displayName, avatarUrl, showOnLeaderboard, targetMinutes } = req.body;
    const updates = {};
    if (displayName        !== undefined) updates.displayName        = displayName;
    if (avatarUrl          !== undefined) updates.avatarUrl          = avatarUrl;
    if (showOnLeaderboard  !== undefined) updates.showOnLeaderboard  = showOnLeaderboard;
    if (targetMinutes      !== undefined) updates.targetMinutes      = targetMinutes;

    await req.user.update(updates);
    res.json({ user: safeUser(req.user) });
  }
);

// ── GET /api/users/personal-bests ─────────────────────────────────────────────
router.get('/personal-bests', requireAuth, async (req, res) => {
  const userId = req.user.id;

  const [longestSession, highestXpSession] = await Promise.all([
    Session.findOne({
      where: { userId },
      order: [['duration_minutes', 'DESC']],
      attributes: ['id', 'startTime', 'durationMinutes', 'xpEarned'],
    }),
    Session.findOne({
      where: { userId },
      order: [['xp_earned', 'DESC']],
      attributes: ['id', 'startTime', 'durationMinutes', 'xpEarned'],
    }),
  ]);

  res.json({
    longestSession,
    longestStreak:    req.user.longestStreak,
    highestXpSession,
  });
});

// ── GET /api/users/dashboard ───────────────────────────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  const user   = req.user;
  const userId = user.id;
  const today  = new Date().toISOString().slice(0, 10);

  // Today's phone-free minutes
  const todaySessions = await Session.findAll({
    where: {
      userId,
      startTime: {
        [Op.gte]: new Date(today),
        [Op.lt]:  new Date(new Date(today).getTime() + 86400000),
      },
    },
  });
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
  const todayXP      = todaySessions.reduce((sum, s) => sum + s.xpEarned,       0);

  // Last 5 sessions
  const recentSessions = await Session.findAll({
    where: { userId },
    order: [['startTime', 'DESC']],
    limit: 5,
  });

  const progress = levelProgress(user.totalXp);

  res.json({
    todayMinutes,
    todayXP,
    currentStreak: user.currentStreak,
    level:         user.level,
    levelProgress: progress,
    recentSessions,
    motivationalMessage: pickMotivationalMessage(user),
  });
});

// ── GET /api/users/:userId/settings  (public — used by MATLAB) ────────────────
router.get('/:userId/settings', async (req, res) => {
  const user = await User.findByPk(req.params.userId, { attributes: ['targetMinutes'] });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ targetMinutes: user.targetMinutes ?? 30 });
});

// ── helpers ────────────────────────────────────────────────────────────────────
function safeUser(user) {
  const { id, email, displayName, avatarUrl, totalXp, level,
    currentStreak, longestStreak, streakFreezes,
    totalPhoneFreeMinutes, showOnLeaderboard, targetMinutes, createdAt } = user;
  return { id, email, displayName, avatarUrl, totalXp, level,
    currentStreak, longestStreak, streakFreezes,
    totalPhoneFreeMinutes, showOnLeaderboard, targetMinutes, createdAt };
}

function pickMotivationalMessage(user) {
  const streak = user.currentStreak;
  if (streak === 0)   return "Place your phone in the box to start your first session!";
  if (streak < 3)     return `${streak}-day streak — you're getting started. Keep it up!`;
  if (streak < 7)     return `${streak}-day streak — building a great habit!`;
  if (streak < 14)    return `${streak}-day streak — you're on fire! 🔥`;
  if (streak < 30)    return `${streak}-day streak — incredible discipline!`;
  return `${streak}-day streak — you're a legend. Don't stop now!`;
}

module.exports = router;
