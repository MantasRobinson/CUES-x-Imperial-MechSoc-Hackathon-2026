import { describe, test, expect } from 'vitest';
import { formatDuration, lastNDays, daysBetween } from '../../src/utils/dateHelpers';

describe('formatDuration', () => {
  test('under 60 min → Xm', () => {
    expect(formatDuration(20)).toBe('20m');
    expect(formatDuration(0)).toBe('0m');
  });

  test('exactly 60 min → 1h', () => {
    expect(formatDuration(60)).toBe('1h');
  });

  test('90 min → 1h 30m', () => {
    expect(formatDuration(90)).toBe('1h 30m');
  });

  test('120 min → 2h', () => {
    expect(formatDuration(120)).toBe('2h');
  });
});

describe('lastNDays', () => {
  test('returns exactly N items', () => {
    expect(lastNDays(7)).toHaveLength(7);
    expect(lastNDays(30)).toHaveLength(30);
  });

  test('last item is today', () => {
    const days = lastNDays(7);
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    expect(days[days.length - 1]).toBe(todayStr);
  });

  test('items are in ascending order', () => {
    const days = lastNDays(5);
    for (let i = 1; i < days.length; i++) {
      expect(days[i] > days[i - 1]).toBe(true);
    }
  });
});

describe('daysBetween', () => {
  test('same date = 0', () => expect(daysBetween('2026-03-14', '2026-03-14')).toBe(0));
  test('one day apart = 1', () => expect(daysBetween('2026-03-14', '2026-03-15')).toBe(1));
  test('month boundary', () => expect(daysBetween('2026-01-31', '2026-02-01')).toBe(1));
});
