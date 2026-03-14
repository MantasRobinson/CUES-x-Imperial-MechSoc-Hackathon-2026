import { describe, test, expect } from 'vitest';
import {
  calculateSessionXP,
  xpRequiredForLevel,
  levelForXP,
  levelProgress,
} from '../../src/utils/xpCalculator';

describe('calculateSessionXP', () => {
  test('base rate — 10 XP/min, no multiplier', () => {
    const { xp, multiplier } = calculateSessionXP(20, 'Moderate');
    expect(xp).toBe(200);
    expect(multiplier).toBe(1.0);
  });

  test('1.5× for >30 min', () => {
    const { xp, multiplier } = calculateSessionXP(31, 'Moderate');
    expect(multiplier).toBe(1.5);
    expect(xp).toBe(Math.round(31 * 10 * 1.5));
  });

  test('2× for >60 min', () => {
    const { multiplier } = calculateSessionXP(61, 'Moderate');
    expect(multiplier).toBe(2.0);
  });

  test('3× for >120 min', () => {
    const { multiplier } = calculateSessionXP(121, 'Moderate');
    expect(multiplier).toBe(3.0);
  });

  test('Quiet adds 50 XP bonus', () => {
    const { xp: q } = calculateSessionXP(20, 'Quiet');
    const { xp: m } = calculateSessionXP(20, 'Moderate');
    expect(q).toBe(m + 50);
  });

  test('Loud gets no bonus', () => {
    const { xp: l } = calculateSessionXP(20, 'Loud');
    const { xp: m } = calculateSessionXP(20, 'Moderate');
    expect(l).toBe(m);
  });
});

describe('xpRequiredForLevel', () => {
  test('level 1 = 0', () => expect(xpRequiredForLevel(1)).toBe(0));
  test('level 2 = 100', () => expect(xpRequiredForLevel(2)).toBe(100));
  test('level 3 = 500', () => expect(xpRequiredForLevel(3)).toBe(500));
});

describe('levelForXP', () => {
  test('0 XP → level 1', () => expect(levelForXP(0)).toBe(1));
  test('100 XP → level 2', () => expect(levelForXP(100)).toBe(2));
  test('500 XP → level 3', () => expect(levelForXP(500)).toBe(3));
  test('round-trips with xpRequiredForLevel', () => {
    for (let l = 1; l <= 10; l++) {
      expect(levelForXP(xpRequiredForLevel(l))).toBe(l);
    }
  });
});

describe('levelProgress', () => {
  test('returns expected keys', () => {
    const r = levelProgress(0);
    expect(r).toHaveProperty('level');
    expect(r).toHaveProperty('progress');
    expect(r).toHaveProperty('currentLevelXP');
    expect(r).toHaveProperty('nextLevelXP');
  });

  test('progress is 0–1', () => {
    for (const xp of [0, 50, 200, 600, 2000]) {
      const { progress } = levelProgress(xp);
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    }
  });
});
