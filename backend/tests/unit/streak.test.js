const { updateStreak, daysBetween } = require('../../src/services/streakService');

describe('daysBetween', () => {
  test('same day = 0', () => {
    expect(daysBetween('2026-03-14', '2026-03-14')).toBe(0);
  });
  test('consecutive days = 1', () => {
    expect(daysBetween('2026-03-14', '2026-03-15')).toBe(1);
  });
  test('two days apart = 2', () => {
    expect(daysBetween('2026-03-14', '2026-03-16')).toBe(2);
  });
  test('month boundary', () => {
    expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1);
  });
});

describe('updateStreak', () => {
  const BASE_USER = {
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 0,
    lastSessionDate: null,
  };

  test('first session starts streak at 1', () => {
    const result = updateStreak(BASE_USER, 20, '2026-03-14');
    expect(result.currentStreak).toBe(1);
    expect(result.lastSessionDate).toBe('2026-03-14');
    expect(result.streakBroken).toBe(false);
  });

  test('session too short (<15 min) does not increment streak', () => {
    const user = { ...BASE_USER, currentStreak: 3, lastSessionDate: '2026-03-13' };
    const result = updateStreak(user, 10, '2026-03-14');
    expect(result.currentStreak).toBe(3);
    expect(result.lastSessionDate).toBe('2026-03-13'); // unchanged
  });

  test('consecutive day increments streak', () => {
    const user = { ...BASE_USER, currentStreak: 5, longestStreak: 5, lastSessionDate: '2026-03-13' };
    const result = updateStreak(user, 20, '2026-03-14');
    expect(result.currentStreak).toBe(6);
    expect(result.longestStreak).toBe(6);
  });

  test('same day does not double-count streak', () => {
    const user = { ...BASE_USER, currentStreak: 5, lastSessionDate: '2026-03-14' };
    const result = updateStreak(user, 20, '2026-03-14');
    expect(result.currentStreak).toBe(5);
  });

  test('two-day gap with freeze uses freeze and continues streak', () => {
    const user = { ...BASE_USER, currentStreak: 3, lastSessionDate: '2026-03-12', streakFreezes: 1 };
    const result = updateStreak(user, 20, '2026-03-14');
    expect(result.currentStreak).toBe(4);
    expect(result.streakFreezes).toBe(0);
    expect(result.streakBroken).toBe(false);
  });

  test('two-day gap without freeze breaks streak', () => {
    const user = { ...BASE_USER, currentStreak: 5, lastSessionDate: '2026-03-12', streakFreezes: 0 };
    const result = updateStreak(user, 20, '2026-03-14');
    expect(result.currentStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
  });

  test('three-day gap always breaks streak even with freeze', () => {
    const user = { ...BASE_USER, currentStreak: 5, lastSessionDate: '2026-03-11', streakFreezes: 2 };
    const result = updateStreak(user, 20, '2026-03-14');
    expect(result.currentStreak).toBe(1);
    expect(result.streakBroken).toBe(true);
  });

  test('awards a freeze at every 7-day milestone', () => {
    // reach exactly 7
    const user = { ...BASE_USER, currentStreak: 6, lastSessionDate: '2026-03-13' };
    const result = updateStreak(user, 20, '2026-03-14');
    expect(result.currentStreak).toBe(7);
    expect(result.streakFreezes).toBe(1);
  });

  test('longestStreak is updated when currentStreak exceeds it', () => {
    const user = { ...BASE_USER, currentStreak: 9, longestStreak: 9, lastSessionDate: '2026-03-13' };
    const result = updateStreak(user, 20, '2026-03-14');
    expect(result.longestStreak).toBe(10);
  });

  test('longestStreak is not reduced when streak breaks', () => {
    const user = { ...BASE_USER, currentStreak: 5, longestStreak: 20, lastSessionDate: '2026-03-01' };
    const result = updateStreak(user, 20, '2026-03-14');
    expect(result.longestStreak).toBe(20);
  });
});
