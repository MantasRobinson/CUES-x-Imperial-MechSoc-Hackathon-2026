const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');

const { User } = require('../models');
const { validate } = require('../middleware/validation');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;

// ── POST /api/auth/register ────────────────────────────────────────────────────
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('displayName').trim().isLength({ min: 1, max: 80 }),
  ],
  validate,
  async (req, res) => {
    const { email, password, displayName } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ email, passwordHash, displayName });

    const token = signToken(user.id);
    return res.status(201).json({ token, user: safeUser(user) });
  }
);

// ── POST /api/auth/login ───────────────────────────────────────────────────────
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = signToken(user.id);
    return res.json({ token, user: safeUser(user) });
  }
);

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.user) });
});

// ── helpers ────────────────────────────────────────────────────────────────────
function signToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function safeUser(user) {
  const { id, email, displayName, avatarUrl, totalXp, level,
    currentStreak, longestStreak, streakFreezes,
    totalPhoneFreeMinutes, showOnLeaderboard, createdAt } = user;
  return { id, email, displayName, avatarUrl, totalXp, level,
    currentStreak, longestStreak, streakFreezes,
    totalPhoneFreeMinutes, showOnLeaderboard, createdAt };
}

module.exports = router;
