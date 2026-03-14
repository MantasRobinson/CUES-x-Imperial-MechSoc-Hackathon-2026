const { progressIncrement } = require('../../src/services/challengeService');

describe('progressIncrement', () => {
  const SESSION = { durationMinutes: 45, noiseLevel: 'Quiet' };

  test('sessions_count — always increments by 1', () => {
    expect(progressIncrement('sessions_count', SESSION)).toBe(1);
  });

  test('total_minutes — increments by session duration', () => {
    expect(progressIncrement('total_minutes', SESSION)).toBe(45);
    expect(progressIncrement('total_minutes', { ...SESSION, durationMinutes: 90 })).toBe(90);
  });

  test('community_minutes — increments by session duration', () => {
    expect(progressIncrement('community_minutes', SESSION)).toBe(45);
  });

  test('unknown type returns 0', () => {
    expect(progressIncrement('some_unknown_type', SESSION)).toBe(0);
  });

  test('zero-duration session contributes 0 minutes', () => {
    expect(progressIncrement('total_minutes', { ...SESSION, durationMinutes: 0 })).toBe(0);
  });
});
