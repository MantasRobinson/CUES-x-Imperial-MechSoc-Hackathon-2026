import React from 'react';
import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonalBests from '../../src/components/Dashboard/PersonalBests';

describe('PersonalBests', () => {
  test('renders all three stat blocks', () => {
    render(
      <PersonalBests
        longestSession={{ durationMinutes: 90, startTime: '2026-03-10T09:00:00Z', xpEarned: 1400 }}
        longestStreak={14}
        highestXpSession={{ durationMinutes: 90, startTime: '2026-03-10T09:00:00Z', xpEarned: 1400 }}
      />
    );
    // '1h 30m' appears twice: once as the stat value and once as the subtitle on highestXpSession
    expect(screen.getAllByText('1h 30m').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('14 days')).toBeDefined();
    expect(screen.getByText('1400 XP')).toBeDefined();
  });

  test('shows em-dashes when no data', () => {
    render(<PersonalBests />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(3);
  });

  test('renders correct section heading', () => {
    render(<PersonalBests />);
    expect(screen.getByText('Personal Bests')).toBeDefined();
  });
});
