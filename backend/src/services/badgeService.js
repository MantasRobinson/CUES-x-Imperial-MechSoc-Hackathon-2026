/**
 * badgeService.js
 * Evaluates which badges a user has newly earned and persists them.
 */

const { Badge, UserBadge } = require('../models');
const { BADGE_CRITERIA } = require('../config/constants');

/**
 * Check all badges and award any newly-qualifying ones to the user.
 *
 * @param {object} user        - Sequelize User instance (with updated stats)
 * @param {object} session     - Sequelize Session instance (just completed)
 * @param {object} stats       - { quietSessionsCount, noisySessionsCount, zeroDisturbanceSessions }
 * @returns {Promise<Badge[]>} - array of newly awarded Badge instances
 */
async function checkAndAwardBadges(user, session, stats) {
  // All badge definitions
  const allBadges = await Badge.findAll();

  // Badges the user already has
  const earned = await UserBadge.findAll({ where: { userId: user.id } });
  const earnedIds = new Set(earned.map((ub) => ub.badgeId));

  const newBadges = [];

  for (const badge of allBadges) {
    if (earnedIds.has(badge.id)) continue;

    if (qualifiesForBadge(badge, user, session, stats)) {
      await UserBadge.create({ userId: user.id, badgeId: badge.id });
      newBadges.push(badge);
    }
  }

  return newBadges;
}

/**
 * Pure eligibility check for a single badge.
 */
function qualifiesForBadge(badge, user, session, stats) {
  const { criteriaType, criteriaValue } = badge;
  const totalHours = user.totalPhoneFreeMinutes / 60;

  switch (criteriaType) {
    case BADGE_CRITERIA.FIRST_SESSION:
      return true; // they just completed a session

    case BADGE_CRITERIA.SESSION_DURATION_GTE:
      return session.durationMinutes >= criteriaValue;

    case BADGE_CRITERIA.TOTAL_PHONE_FREE_HOURS:
      return totalHours >= criteriaValue;

    case BADGE_CRITERIA.STREAK_DAYS:
      return user.currentStreak >= criteriaValue;

    case BADGE_CRITERIA.QUIET_SESSIONS:
      return (stats.quietSessionsCount || 0) >= criteriaValue;

    case BADGE_CRITERIA.NOISY_SESSIONS:
      return (stats.noisySessionsCount || 0) >= criteriaValue;

    case BADGE_CRITERIA.LEVEL:
      return user.level >= criteriaValue;

    case BADGE_CRITERIA.ZERO_DISTURBANCE_SESSIONS:
      return (stats.zeroDisturbanceSessions || 0) >= criteriaValue;

    case BADGE_CRITERIA.NIGHT_SESSION: {
      const hour = new Date(session.startTime).getHours();
      return hour >= 22 || hour < 6;
    }

    case BADGE_CRITERIA.MARATHON_SESSION:
      return session.durationMinutes >= 180;

    default:
      return false;
  }
}

module.exports = { checkAndAwardBadges, qualifiesForBadge };
