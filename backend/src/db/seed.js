/**
 * seed.js — populate badges and sample challenges.
 * Run with: npm run seed
 */
require('dotenv').config();
const { sequelize, Badge, Challenge } = require('../models');
const { BADGE_CRITERIA } = require('../config/constants');

const BADGES = [
  {
    name: 'First Step',
    description: 'Complete your very first session.',
    criteriaType: BADGE_CRITERIA.FIRST_SESSION,
    criteriaValue: 0,
    rarity: 'Common',
    iconEmoji: '👣',
  },
  {
    name: 'Hour of Power',
    description: 'Complete a single session of 60 minutes or more.',
    criteriaType: BADGE_CRITERIA.SESSION_DURATION_GTE,
    criteriaValue: 60,
    rarity: 'Uncommon',
    iconEmoji: '⚡',
  },
  {
    name: 'Zen Master',
    description: 'Accumulate 24 hours of total phone-free time.',
    criteriaType: BADGE_CRITERIA.TOTAL_PHONE_FREE_HOURS,
    criteriaValue: 24,
    rarity: 'Rare',
    iconEmoji: '🧘',
  },
  {
    name: 'Iron Will',
    description: 'Maintain a 30-day streak.',
    criteriaType: BADGE_CRITERIA.STREAK_DAYS,
    criteriaValue: 30,
    rarity: 'Epic',
    iconEmoji: '🦾',
  },
  {
    name: 'Silent Scholar',
    description: 'Complete 10 sessions in a quiet environment.',
    criteriaType: BADGE_CRITERIA.QUIET_SESSIONS,
    criteriaValue: 10,
    rarity: 'Uncommon',
    iconEmoji: '📚',
  },
  {
    name: 'Socialite Stopper',
    description: 'Complete 5 sessions in a noisy/group environment.',
    criteriaType: BADGE_CRITERIA.NOISY_SESSIONS,
    criteriaValue: 5,
    rarity: 'Uncommon',
    iconEmoji: '🎉',
  },
  {
    name: 'Centurion',
    description: 'Reach Level 100.',
    criteriaType: BADGE_CRITERIA.LEVEL,
    criteriaValue: 100,
    rarity: 'Legendary',
    iconEmoji: '🏆',
  },
  {
    name: 'Unshakeable',
    description: 'Complete 10 sessions with zero disturbance events.',
    criteriaType: BADGE_CRITERIA.ZERO_DISTURBANCE_SESSIONS,
    criteriaValue: 10,
    rarity: 'Rare',
    iconEmoji: '🪨',
  },
  {
    name: 'Night Owl',
    description: 'Complete a session between 22:00 and 06:00.',
    criteriaType: BADGE_CRITERIA.NIGHT_SESSION,
    criteriaValue: 0,
    rarity: 'Common',
    iconEmoji: '🦉',
  },
  {
    name: 'Marathon',
    description: 'Complete a single session of 3 hours or more.',
    criteriaType: BADGE_CRITERIA.MARATHON_SESSION,
    criteriaValue: 180,
    rarity: 'Epic',
    iconEmoji: '🏃',
  },
];

// Generate challenges relative to today
function generateChallenges() {
  const today   = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Next Monday for weekly end
  const nextMonday = new Date(today);
  const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
  nextMonday.setDate(today.getDate() + daysUntilMonday);
  const weekEndStr = nextMonday.toISOString().slice(0, 10);

  return [
    {
      title: 'Double Session Day',
      description: 'Complete 2 phone-free sessions today.',
      type: 'daily',
      criteriaType: 'sessions_count',
      criteriaValue: 2,
      xpReward: 100,
      startsAt: todayStr,
      endsAt:   todayStr,
    },
    {
      title: 'Power Hour',
      description: 'Accumulate 60 minutes phone-free today.',
      type: 'daily',
      criteriaType: 'total_minutes',
      criteriaValue: 60,
      xpReward: 80,
      startsAt: todayStr,
      endsAt:   todayStr,
    },
    {
      title: 'Weekly Warrior',
      description: 'Accumulate 5 hours phone-free this week.',
      type: 'weekly',
      criteriaType: 'total_minutes',
      criteriaValue: 300,
      xpReward: 500,
      startsAt: todayStr,
      endsAt:   weekEndStr,
    },
    {
      title: 'Consistency Quest',
      description: 'Complete at least one session every day this week.',
      type: 'weekly',
      criteriaType: 'sessions_count',
      criteriaValue: 7,
      xpReward: 700,
      startsAt: todayStr,
      endsAt:   weekEndStr,
    },
    {
      title: 'Class-Wide Focus',
      description: 'As a class, accumulate 1,000 minutes of phone-free time this week.',
      type: 'community',
      criteriaType: 'community_minutes',
      criteriaValue: 1000,
      xpReward: 300,
      communityGoal: 1000,
      communityProgress: 0,
      startsAt: todayStr,
      endsAt:   weekEndStr,
    },
  ];
}

async function seed() {
  await sequelize.sync({ alter: true });
  console.log('DB synced.');

  for (const badgeData of BADGES) {
    const [badge, created] = await Badge.findOrCreate({
      where: { name: badgeData.name },
      defaults: badgeData,
    });
    console.log(`Badge "${badge.name}" — ${created ? 'created' : 'already exists'}`);
  }

  const challenges = generateChallenges();
  for (const ch of challenges) {
    const [challenge, created] = await Challenge.findOrCreate({
      where: { title: ch.title, startsAt: ch.startsAt },
      defaults: ch,
    });
    console.log(`Challenge "${challenge.title}" — ${created ? 'created' : 'already exists'}`);
  }

  console.log('Seed complete.');
  await sequelize.close();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
