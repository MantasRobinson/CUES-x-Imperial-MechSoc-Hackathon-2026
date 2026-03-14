const {
  calculateSessionXP,
  xpRequiredForLevel,
  levelForXP,
  levelProgress,
} = require('../../src/services/gamificationService');

describe('calculateSessionXP', () => {
  test('10 XP per minute at base rate (no multiplier)', () => {
    const { xp, multiplier } = calculateSessionXP(20, 'Moderate');
    expect(xp).toBe(200);
    expect(multiplier).toBe(1.0);
  });

  test('1.5× multiplier for sessions > 30 min', () => {
    const { xp, multiplier } = calculateSessionXP(31, 'Moderate');
    expect(multiplier).toBe(1.5);
    expect(xp).toBe(Math.round(31 * 10 * 1.5));
  });

  test('2× multiplier for sessions > 60 min', () => {
    const { xp, multiplier } = calculateSessionXP(61, 'Moderate');
    expect(multiplier).toBe(2.0);
    expect(xp).toBe(Math.round(61 * 10 * 2.0));
  });

  test('3× multiplier for sessions > 120 min', () => {
    const { xp, multiplier } = calculateSessionXP(121, 'Moderate');
    expect(multiplier).toBe(3.0);
    expect(xp).toBe(Math.round(121 * 10 * 3.0));
  });

  test('adds 50 XP bonus for Quiet sessions', () => {
    const { xp: quietXp }    = calculateSessionXP(20, 'Quiet');
    const { xp: moderateXp } = calculateSessionXP(20, 'Moderate');
    expect(quietXp).toBe(moderateXp + 50);
  });

  test('no bonus for Loud sessions', () => {
    const { xp: loudXp }     = calculateSessionXP(20, 'Loud');
    const { xp: moderateXp } = calculateSessionXP(20, 'Moderate');
    expect(loudXp).toBe(moderateXp);
  });

  test('zero-minute session earns 0 base XP (only bonus if Quiet)', () => {
    const { xp: mod } = calculateSessionXP(0, 'Moderate');
    expect(mod).toBe(0);
    const { xp: quiet } = calculateSessionXP(0, 'Quiet');
    expect(quiet).toBe(50);
  });

  test('exactly 30 min does NOT get 1.5× (boundary: >30 required)', () => {
    const { multiplier } = calculateSessionXP(30, 'Moderate');
    expect(multiplier).toBe(1.0);
  });

  test('exactly 60 min does NOT get 2× (boundary: >60 required)', () => {
    const { multiplier } = calculateSessionXP(60, 'Moderate');
    expect(multiplier).toBe(1.5);
  });
});

describe('xpRequiredForLevel', () => {
  test('level 1 requires 0 XP', () => {
    expect(xpRequiredForLevel(1)).toBe(0);
  });

  test('level 2 requires 1^2 * 100 = 100 XP', () => {
    expect(xpRequiredForLevel(2)).toBe(100);
  });

  test('level 3 requires 1^2*100 + 2^2*100 = 500 XP', () => {
    expect(xpRequiredForLevel(3)).toBe(500);
  });

  test('level 4 requires 1^2+2^2+3^2 * 100 = 1400 XP', () => {
    expect(xpRequiredForLevel(4)).toBe(1400);
  });
});

describe('levelForXP', () => {
  test('0 XP = level 1', () => {
    expect(levelForXP(0)).toBe(1);
  });

  test('99 XP = level 1 (just under level 2 threshold)', () => {
    expect(levelForXP(99)).toBe(1);
  });

  test('100 XP = level 2', () => {
    expect(levelForXP(100)).toBe(2);
  });

  test('499 XP = level 2', () => {
    expect(levelForXP(499)).toBe(2);
  });

  test('500 XP = level 3', () => {
    expect(levelForXP(500)).toBe(3);
  });

  test('levelForXP is inverse of xpRequiredForLevel', () => {
    for (let level = 1; level <= 10; level++) {
      expect(levelForXP(xpRequiredForLevel(level))).toBe(level);
    }
  });
});

describe('levelProgress', () => {
  test('returns correct structure', () => {
    const result = levelProgress(100);
    expect(result).toHaveProperty('level');
    expect(result).toHaveProperty('currentLevelXP');
    expect(result).toHaveProperty('nextLevelXP');
    expect(result).toHaveProperty('progress');
  });

  test('progress is between 0 and 1', () => {
    for (const xp of [0, 50, 100, 300, 1000, 5000]) {
      const { progress } = levelProgress(xp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });

  test('at exact level threshold progress = 0 (start of new level)', () => {
    const xp = xpRequiredForLevel(3); // 500
    const { progress, level } = levelProgress(xp);
    expect(level).toBe(3);
    expect(progress).toBe(0);
  });
});
