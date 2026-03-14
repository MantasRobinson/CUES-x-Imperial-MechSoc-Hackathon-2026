// XP & Levelling
const XP_PER_MINUTE = 10;
const XP_MULTIPLIERS = [
  { minMinutes: 120, multiplier: 3.0 },
  { minMinutes: 60,  multiplier: 2.0 },
  { minMinutes: 30,  multiplier: 1.5 },
];
const XP_QUIET_BONUS = 50; // flat bonus for a Quiet-environment session

// Level N requires (N^2 * 100) XP to advance FROM level N to N+1
// So cumulative XP to reach level N = sum_{i=1}^{N-1} i^2 * 100
const XP_PER_LEVEL_FACTOR = 100;

// Streak
const STREAK_MIN_SESSION_MINUTES = 15; // session must be >= this to count toward daily streak
const STREAK_FREEZE_MILESTONE = 7;     // earn a freeze every N days of streak

// Noise levels
const NOISE_LEVELS = ['Quiet', 'Moderate', 'Loud'];

// Leaderboard
const LEADERBOARD_LIMIT = 50;

// Badge criteria types
const BADGE_CRITERIA = {
  FIRST_SESSION:             'first_session',
  SESSION_DURATION_GTE:      'session_duration_gte',   // single session >= value minutes
  TOTAL_PHONE_FREE_HOURS:    'total_phone_free_hours',  // cumulative hours >= value
  STREAK_DAYS:               'streak_days',             // current streak >= value
  QUIET_SESSIONS:            'quiet_sessions',          // count of quiet sessions >= value
  NOISY_SESSIONS:            'noisy_sessions',          // count of noisy sessions >= value
  LEVEL:                     'level',                   // level >= value
  ZERO_DISTURBANCE_SESSIONS: 'zero_disturbance_sessions', // sessions with 0 disturbances >= value
  NIGHT_SESSION:             'night_session',           // any session between 22:00–06:00
  MARATHON_SESSION:          'marathon_session',        // single session >= 180 min
};

module.exports = {
  XP_PER_MINUTE,
  XP_MULTIPLIERS,
  XP_QUIET_BONUS,
  XP_PER_LEVEL_FACTOR,
  STREAK_MIN_SESSION_MINUTES,
  STREAK_FREEZE_MILESTONE,
  NOISE_LEVELS,
  LEADERBOARD_LIMIT,
  BADGE_CRITERIA,
};
