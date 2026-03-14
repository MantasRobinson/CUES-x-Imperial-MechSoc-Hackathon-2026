/**
 * challengeService.js
 * Update challenge progress for a user after a session.
 */

const { Op } = require('sequelize');
const { Challenge, UserChallenge } = require('../models');

/**
 * For each active challenge the user has joined, increment progress and
 * mark complete when the goal is met. Also updates community challenges.
 *
 * @param {string} userId
 * @param {object} session  - plain session data { durationMinutes, noiseLevel, ... }
 * @returns {Promise<UserChallenge[]>} - newly completed user challenges
 */
async function updateChallengeProgress(userId, session) {
  const today = new Date().toISOString().slice(0, 10);

  // Active challenges the user has joined
  const userChallenges = await UserChallenge.findAll({
    where: { userId, completed: false },
    include: [{
      model: Challenge,
      as: 'challenge',
      where: {
        startsAt: { [Op.lte]: today },
        endsAt:   { [Op.gte]: today },
      },
    }],
  });

  const completed = [];

  for (const uc of userChallenges) {
    const ch = uc.challenge;
    const increment = progressIncrement(ch.criteriaType, session);
    if (increment === 0) continue;

    uc.progress += increment;

    // Update community challenge aggregate
    if (ch.type === 'community') {
      await Challenge.increment('communityProgress', {
        by: increment,
        where: { id: ch.id },
      });
    }

    if (uc.progress >= ch.criteriaValue) {
      uc.completed   = true;
      uc.completedAt = new Date();
      completed.push(uc);
    }

    await uc.save();
  }

  return completed;
}

/**
 * How much a session contributes to a challenge's progress counter.
 */
function progressIncrement(criteriaType, session) {
  switch (criteriaType) {
    case 'sessions_count':
      return 1;
    case 'total_minutes':
    case 'community_minutes':
      return session.durationMinutes;
    default:
      return 0;
  }
}

/**
 * Join an active challenge (idempotent).
 */
async function joinChallenge(userId, challengeId) {
  const [uc] = await UserChallenge.findOrCreate({
    where: { userId, challengeId },
    defaults: { progress: 0, completed: false },
  });
  return uc;
}

module.exports = { updateChallengeProgress, joinChallenge, progressIncrement };
