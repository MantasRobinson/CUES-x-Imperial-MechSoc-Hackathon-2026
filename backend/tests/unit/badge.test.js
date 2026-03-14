const { qualifiesForBadge } = require('../../src/services/badgeService');
const { BADGE_CRITERIA } = require('../../src/config/constants');

// Helper to build a badge object
function badge(criteriaType, criteriaValue) {
  return { criteriaType, criteriaValue };
}

// A mock user with all relevant stats
const BASE_USER = {
  id: 'user-1',
  totalPhoneFreeMinutes: 0,
  currentStreak: 0,
  level: 1,
};

// A mock session
const BASE_SESSION = {
  durationMinutes: 20,
  disturbanceCount: 0,
  startTime: new Date('2026-03-14T10:00:00Z'),
  noiseLevel: 'Moderate',
};

const BASE_STATS = {
  quietSessionsCount:      0,
  noisySessionsCount:      0,
  zeroDisturbanceSessions: 0,
};

describe('qualifiesForBadge', () => {
  test('first_session — always true', () => {
    expect(qualifiesForBadge(badge(BADGE_CRITERIA.FIRST_SESSION, 0), BASE_USER, BASE_SESSION, BASE_STATS)).toBe(true);
  });

  test('session_duration_gte — qualifies when duration >= value', () => {
    const b = badge(BADGE_CRITERIA.SESSION_DURATION_GTE, 60);
    expect(qualifiesForBadge(b, BASE_USER, { ...BASE_SESSION, durationMinutes: 60  }, BASE_STATS)).toBe(true);
    expect(qualifiesForBadge(b, BASE_USER, { ...BASE_SESSION, durationMinutes: 59  }, BASE_STATS)).toBe(false);
    expect(qualifiesForBadge(b, BASE_USER, { ...BASE_SESSION, durationMinutes: 120 }, BASE_STATS)).toBe(true);
  });

  test('total_phone_free_hours — qualifies when hours >= value', () => {
    const b = badge(BADGE_CRITERIA.TOTAL_PHONE_FREE_HOURS, 24);
    const userWith24h = { ...BASE_USER, totalPhoneFreeMinutes: 1440 };
    const userWith23h = { ...BASE_USER, totalPhoneFreeMinutes: 1380 };
    expect(qualifiesForBadge(b, userWith24h, BASE_SESSION, BASE_STATS)).toBe(true);
    expect(qualifiesForBadge(b, userWith23h, BASE_SESSION, BASE_STATS)).toBe(false);
  });

  test('streak_days — qualifies when currentStreak >= value', () => {
    const b = badge(BADGE_CRITERIA.STREAK_DAYS, 7);
    expect(qualifiesForBadge(b, { ...BASE_USER, currentStreak: 7  }, BASE_SESSION, BASE_STATS)).toBe(true);
    expect(qualifiesForBadge(b, { ...BASE_USER, currentStreak: 6  }, BASE_SESSION, BASE_STATS)).toBe(false);
    expect(qualifiesForBadge(b, { ...BASE_USER, currentStreak: 30 }, BASE_SESSION, BASE_STATS)).toBe(true);
  });

  test('quiet_sessions — qualifies when count >= value', () => {
    const b = badge(BADGE_CRITERIA.QUIET_SESSIONS, 10);
    expect(qualifiesForBadge(b, BASE_USER, BASE_SESSION, { ...BASE_STATS, quietSessionsCount: 10 })).toBe(true);
    expect(qualifiesForBadge(b, BASE_USER, BASE_SESSION, { ...BASE_STATS, quietSessionsCount: 9  })).toBe(false);
  });

  test('noisy_sessions — qualifies when count >= value', () => {
    const b = badge(BADGE_CRITERIA.NOISY_SESSIONS, 5);
    expect(qualifiesForBadge(b, BASE_USER, BASE_SESSION, { ...BASE_STATS, noisySessionsCount: 5 })).toBe(true);
    expect(qualifiesForBadge(b, BASE_USER, BASE_SESSION, { ...BASE_STATS, noisySessionsCount: 4 })).toBe(false);
  });

  test('level — qualifies when level >= value', () => {
    const b = badge(BADGE_CRITERIA.LEVEL, 5);
    expect(qualifiesForBadge(b, { ...BASE_USER, level: 5 }, BASE_SESSION, BASE_STATS)).toBe(true);
    expect(qualifiesForBadge(b, { ...BASE_USER, level: 4 }, BASE_SESSION, BASE_STATS)).toBe(false);
  });

  test('zero_disturbance_sessions — qualifies when count >= value', () => {
    const b = badge(BADGE_CRITERIA.ZERO_DISTURBANCE_SESSIONS, 10);
    expect(qualifiesForBadge(b, BASE_USER, BASE_SESSION, { ...BASE_STATS, zeroDisturbanceSessions: 10 })).toBe(true);
    expect(qualifiesForBadge(b, BASE_USER, BASE_SESSION, { ...BASE_STATS, zeroDisturbanceSessions: 9  })).toBe(false);
  });

  test('night_session — qualifies for sessions starting 22:00–05:59', () => {
    const b = badge(BADGE_CRITERIA.NIGHT_SESSION, 0);
    const night  = { ...BASE_SESSION, startTime: new Date('2026-03-14T22:30:00') };
    const earlyMorning = { ...BASE_SESSION, startTime: new Date('2026-03-14T05:00:00') };
    const daytime = { ...BASE_SESSION, startTime: new Date('2026-03-14T14:00:00') };
    expect(qualifiesForBadge(b, BASE_USER, night, BASE_STATS)).toBe(true);
    expect(qualifiesForBadge(b, BASE_USER, earlyMorning, BASE_STATS)).toBe(true);
    expect(qualifiesForBadge(b, BASE_USER, daytime, BASE_STATS)).toBe(false);
  });

  test('marathon_session — qualifies for sessions >= 180 min', () => {
    const b = badge(BADGE_CRITERIA.MARATHON_SESSION, 180);
    expect(qualifiesForBadge(b, BASE_USER, { ...BASE_SESSION, durationMinutes: 180 }, BASE_STATS)).toBe(true);
    expect(qualifiesForBadge(b, BASE_USER, { ...BASE_SESSION, durationMinutes: 179 }, BASE_STATS)).toBe(false);
  });

  test('unknown criteria type returns false', () => {
    const b = badge('unknown_criteria', 0);
    expect(qualifiesForBadge(b, BASE_USER, BASE_SESSION, BASE_STATS)).toBe(false);
  });
});
