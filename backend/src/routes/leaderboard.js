const express = require('express');
const { Op } = require('sequelize');
const { User, Session } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { LEADERBOARD_LIMIT } = require('../config/constants');

const router = express.Router();

// ── GET /api/leaderboard/weekly-xp ────────────────────────────────────────────
// XP earned in the current ISO week (resets each Monday)
router.get('/weekly-xp', requireAuth, async (req, res) => {
  const monday = getMondayOfCurrentWeek();

  const users = await User.findAll({
    where: { showOnLeaderboard: true },
    attributes: ['id', 'displayName', 'avatarUrl', 'level'],
  });

  // Sum XP per user for sessions since Monday
  const rows = await Promise.all(
    users.map(async (u) => {
      const sessions = await Session.findAll({
        where: { userId: u.id, createdAt: { [Op.gte]: monday } },
        attributes: ['xpEarned'],
      });
      const weeklyXp = sessions.reduce((s, sess) => s + sess.xpEarned, 0);
      return { user: pick(u), weeklyXp };
    })
  );

  const sorted = rows
    .sort((a, b) => b.weeklyXp - a.weeklyXp)
    .slice(0, LEADERBOARD_LIMIT)
    .map((r, i) => ({ rank: i + 1, ...r }));

  res.json(sorted);
});

// ── GET /api/leaderboard/all-time-hours ───────────────────────────────────────
router.get('/all-time-hours', requireAuth, async (req, res) => {
  const users = await User.findAll({
    where: { showOnLeaderboard: true },
    attributes: ['id', 'displayName', 'avatarUrl', 'level', 'totalPhoneFreeMinutes'],
    order: [['totalPhoneFreeMinutes', 'DESC']],
    limit: LEADERBOARD_LIMIT,
  });

  const result = users.map((u, i) => ({
    rank: i + 1,
    user: pick(u),
    totalHours: parseFloat((u.totalPhoneFreeMinutes / 60).toFixed(1)),
  }));

  res.json(result);
});

// ── GET /api/leaderboard/longest-streak ───────────────────────────────────────
router.get('/longest-streak', requireAuth, async (req, res) => {
  const users = await User.findAll({
    where: { showOnLeaderboard: true },
    attributes: ['id', 'displayName', 'avatarUrl', 'level', 'currentStreak'],
    order: [['currentStreak', 'DESC']],
    limit: LEADERBOARD_LIMIT,
  });

  const result = users.map((u, i) => ({
    rank: i + 1,
    user: pick(u),
    currentStreak: u.currentStreak,
  }));

  res.json(result);
});

// ── helpers ────────────────────────────────────────────────────────────────────
function getMondayOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun ... 6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // days back to Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function pick(user) {
  return { id: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, level: user.level };
}

module.exports = router;
