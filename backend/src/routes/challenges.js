const express = require('express');
const { Op } = require('sequelize');
const { Challenge, UserChallenge } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { joinChallenge } = require('../services/challengeService');

const router = express.Router();

// ── GET /api/challenges ────────────────────────────────────────────────────────
// Returns active daily, weekly, and community challenges, annotated with
// the requesting user's progress/completion status.
router.get('/', requireAuth, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const activeChallenges = await Challenge.findAll({
    where: {
      startsAt: { [Op.lte]: today },
      endsAt:   { [Op.gte]: today },
    },
    order: [['type', 'ASC']],
  });

  // User's progress entries
  const challengeIds = activeChallenges.map((c) => c.id);
  const userProgress = await UserChallenge.findAll({
    where: { userId: req.user.id, challengeId: { [Op.in]: challengeIds } },
  });
  const progressMap = Object.fromEntries(userProgress.map((uc) => [uc.challengeId, uc]));

  const annotated = activeChallenges.map((c) => {
    const uc = progressMap[c.id];
    return {
      ...c.toJSON(),
      joined:    !!uc,
      progress:  uc ? uc.progress   : 0,
      completed: uc ? uc.completed  : false,
    };
  });

  const daily     = annotated.filter((c) => c.type === 'daily');
  const weekly    = annotated.filter((c) => c.type === 'weekly');
  const community = annotated.filter((c) => c.type === 'community');

  res.json({ daily, weekly, community });
});

// ── POST /api/challenges/:id/join ──────────────────────────────────────────────
router.post('/:id/join', requireAuth, async (req, res) => {
  const challenge = await Challenge.findByPk(req.params.id);
  if (!challenge) return res.status(404).json({ error: 'Challenge not found.' });

  const today = new Date().toISOString().slice(0, 10);
  if (challenge.endsAt < today) {
    return res.status(400).json({ error: 'Challenge has already ended.' });
  }

  const uc = await joinChallenge(req.user.id, challenge.id);
  res.json({ userChallenge: uc });
});

module.exports = router;
